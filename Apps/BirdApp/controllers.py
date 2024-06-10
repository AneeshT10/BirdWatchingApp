"""
This file defines actions, i.e. functions the URLs are mapped into
The @action(path) decorator exposed the function at URL:

    http://127.0.0.1:8000/{app_name}/{path}

If app_name == '_default' then simply

    http://127.0.0.1:8000/{path}

If path == 'index' it can be omitted:

    http://127.0.0.1:8000/

The path follows the bottlepy syntax.

@action.uses('generic.html')  indicates that the action uses the generic.html template
@action.uses(session)         indicates that the action uses the session
@action.uses(db)              indicates that the action uses the db
@action.uses(T)               indicates that the action uses the i18n & pluralization
@action.uses(auth.user)       indicates that the action requires a logged in user
@action.uses(auth)            indicates that the action requires the auth object

session, db, T, auth, and tempates are examples of Fixtures.
Warning: Fixtures MUST be declared with @action.uses({fixtures}) else your app will result in undefined behavior
"""

import datetime
from py4web import action, request, abort, redirect, URL
from yatl.helpers import A
from .common import db, session, T, cache, auth, logger, authenticated, unauthenticated, flash
from py4web.utils.url_signer import URLSigner
from .models import get_user_email, load_csv_files
from py4web.utils.form import Form, FormStyleBulma
from py4web.utils.grid import Grid, GridClassStyleBulma
import json

url_signer = URLSigner(session)

@action('index')
@action.uses('index.html', db, auth, url_signer)
def index():
    load_csv_files()
    return dict(
        # COMPLETE: return here any signed URLs you need.
        my_callback_url = URL('my_callback', signer=url_signer),
        get_species_url = URL('get_species', signer=url_signer),
        get_checklists_url = URL('get_checklists', signer=url_signer),
        get_sightings_url = URL('get_sightings', signer=url_signer),
        stats_url = URL('statistics', signer=url_signer),
        my_checklists_url = URL('my_checklists', signer=url_signer),
    )
@action('statistics')
@action.uses('statistics.html', db, auth.user, url_signer)
def statistics():
    user_email = get_user_email()
    # Fetch species seen by the user
    species_seen = db(db.checklists.observer_id == user_email).select(
        db.sightings.common_name,
        distinct=True,
        join=db.sightings.on(db.sightings.sampling_event_id == db.checklists.sampling_event_id)
    )
    # Fetch sightings over time
    sightings_over_time = db(db.checklists.observer_id == user_email).select(
        db.checklists.observation_date,
        db.sightings.common_name,
        db.sightings.observation_count,
        orderby=db.checklists.observation_date,
        join=db.sightings.on(db.sightings.sampling_event_id == db.checklists.sampling_event_id)
    )

    # Fetch sighting locations
    sighting_locations = db(db.checklists.observer_id == user_email).select(
        db.checklists.lat,
        db.checklists.lng,
        db.sightings.common_name,
        db.sightings.observation_count,
        join=db.sightings.on(db.sightings.sampling_event_id == db.checklists.sampling_event_id)
    )

    # Convert to JSON
    species_seen_json = species_seen.as_list()
    sightings_over_time_json = sightings_over_time.as_list()
    sighting_locations_json = sighting_locations.as_list()

    return dict(
        total_hours_url=URL('total_hours', signer=url_signer),
        species_seen=species_seen_json,
        sightings_over_time=sightings_over_time_json,
        sighting_locations=sighting_locations_json,
    )

@action('location')
#@action('statistics?<swLat:float>&<swLng:float>&<nwLat:float>&<nwLng:float>&<neLat:float>&<neLng:float>&<seLat:float>&<seLng:float>')
@action.uses('location.html', db, auth.user, url_signer, session)
def location():
    #Loaded rectangle region
    swLat = float(request.params.get('swLat'))
    swLng = float(request.params.get('swLng'))
    nwLat = float(request.params.get('nwLat'))
    nwLng = float(request.params.get('nwLng'))
    neLat = float(request.params.get('neLat'))
    neLng = float(request.params.get('neLng'))
    seLat = float(request.params.get('seLat'))
    seLng = float(request.params.get('seLng'))

    session['region_coords'] = [swLat, swLng, neLat, neLng]
    #Filter Stats located in this region
    # Join the sightings and checklists tables on sampling_event_id
    sightings_with_location = db(db.sightings.sampling_event_id == db.checklists.sampling_event_id)

    # Filter the sightings based on the region coordinates
    sightings_in_region = sightings_with_location((db.checklists.lat >= min(swLat, nwLat, neLat, seLat)) & 
                            (db.checklists.lat <= max(swLat, nwLat, neLat, seLat)) &
                            (db.checklists.lng >= min(swLng, nwLng, neLng, seLng)) &
                            (db.checklists.lng <= max(swLng, nwLng, neLng, seLng)))

    # Group the filtered sightings by species and count the number of checklists and total sightings for each species
    species_stats = sightings_in_region.select(db.sightings.common_name, 
                                            db.sightings.sampling_event_id.count().with_alias('checklist_count'), 
                                            db.sightings.observation_count.sum().with_alias('total_sightings'),
                                            groupby=db.sightings.common_name)

    # Convert species_stats to a list of dictionaries
    species_stats_list = [dict(common_name=row.sightings.common_name, 
                               checklist_count=row.checklist_count,
                               total_sightings=row.total_sightings) 
                          for row in species_stats]

    # Convert species_stats_list to JSON
    species_stats_json = json.dumps(species_stats_list)
    return dict(location_url = URL('location', signer=url_signer), 
                get_sightings_url = URL('get_sightings', signer=url_signer),
                get_checklists_url = URL('get_checklists', signer=url_signer),
                species_stats=species_stats_json)
    
@action("checklist")
@action.uses('checklist.html', db, auth.user, url_signer)
def checklist():
    return dict(
        # COMPLETE: return here any signed URLs you need.
        my_callback_url = URL('my_callback', signer=url_signer),
        get_species_url = URL('get_species', signer=url_signer),
        submit_checklist_url = URL('submit_checklist', signer=url_signer),
        search_species_url = URL('search_species', signer=url_signer),
        my_checklists_url = URL('my_checklists', signer=url_signer),
    )

@action('my_callback')
@action.uses() # Add here things like db, auth, etc.
def my_callback():
    # The return value should be a dictionary that will be sent as JSON.
    return dict(my_value=3)

@action('get_species')
def get_species():
    species = db(db.species).select().as_list()
    return dict(species=species)

@action('get_all_sightings')
@action.uses(session, db)
def get_all_sightings():
    return(dict(sightings=db(db.sightings).select().as_list()))

@action('get_sightings')
@action.uses(session, db)
def get_sightings():
    region_coords = session.get('region_coords')  # Get the coordinates of the region
    bird_name = request.params.get('bird_name')  # Get the bird name from the request parameters
    heatmap = request.params.get('heatmap')  # Get the heatmap flag from the request parameters
    if region_coords and not heatmap:
        region_coords = [float(coord) for coord in region_coords]  # Convert to list of floats

    if region_coords and not heatmap:
        # Join the sightings table with the checklists and species tables
        query = (db.sightings.sampling_event_id == db.checklists.sampling_event_id)

        # Add a condition to the where clause to filter the records based on the coordinates
        query &= (db.checklists.lat >= region_coords[0]) & (db.checklists.lat <= region_coords[2]) & \
                 (db.checklists.lng >= region_coords[1]) & (db.checklists.lng <= region_coords[3])
        # Add a condition to the where clause to filter the records based on the bird name
        if bird_name:
            query &= (db.sightings.common_name == bird_name)
        sightings = db(query).select(
            db.sightings.sampling_event_id,
            db.sightings.observation_count.sum(),
            groupby=db.sightings.sampling_event_id,
            orderby=db.sightings.sampling_event_id
        ).as_list()

    else:
        sightings = db( (db.sightings.common_name == bird_name) & (db.sightings.observation_count > 0)).select().as_list()
    return dict(sightings=sightings)

@action('get_checklists')
def get_checklists():
    event_ids = request.params.get('event_ids')

    if event_ids:
        event_ids = event_ids.split(',') # Convert to list
        checklists = db(db.checklists.sampling_event_id.belongs(event_ids)).select().as_list()

    else:
        checklists = db(db.checklists).select().as_list()
    return dict(checklists=checklists)

@action('search_species', method=['GET'])
@action.uses(db)
def search_species():
    try:
        query = request.params.get('query')
        species = db(db.species.bird_name.contains(query)).select().as_list()
        return dict(species=species)
    except Exception as e:
        logger.error(f"Error searching for species with query {query}: {e}")
        return dict(species=[])

@action('submit_checklist', method=['POST'])
@action.uses(db, auth.user)
def submit_checklist():
    try:
        data = request.json

        checklist_id = db.checklists.insert(
            sampling_event_id= 0,
            observer_id=auth.current_user['email'], 
            lat=data['lat'], 
            lng=data['lng'], 
            observation_date=data['date'],
            observation_time=datetime.datetime.now().time(),
            duration=data['duration']
        )
        db(db.checklists.id == checklist_id).update(sampling_event_id=checklist_id)

        for sighting in data['sightings']:
            db.sightings.insert(
                sampling_event_id=checklist_id, 
                common_name=sighting['name'], 
                observation_count=sighting['count']
            )
        return dict(status='success')
    except Exception as e:
        logger.error(f"Error submitting checklist: {e}")
        return dict(status='error', message=str(e))

@action('get_my_checklists', method=['GET'])
@action.uses(db, auth.user)
def get_my_checklists():
    user_id = auth.current_user['email']
    checklists = db(db.checklists.observer_id == user_id).select().as_list()
    return dict(checklists=checklists)

@action('my_checklists')
@action.uses('my_checklists.html', db, auth.user)
def my_checklists():
    return dict(
        get_my_checklists_url=URL('get_my_checklists'),
        get_birds_by_event_url=URL('get_birds_by_event'),
        delete_checklist_url=URL('delete_checklist'),
    )

@action('delete_checklist', method=['POST'])
@action.uses(db, auth.user)
def delete_checklist():
    try:
        data = request.json
        checklist_id = data.get('id')
        # Get the sampling_event_id of the checklist being deleted
        sampling_event_id = db(db.checklists.id == checklist_id).select(db.checklists.sampling_event_id).first().sampling_event_id
        # Delete the checklist
        db(db.checklists.id == checklist_id).delete()
        # Delete all sightings with the same sampling_event_id
        db(db.sightings.sampling_event_id == sampling_event_id).delete()
        return dict(status='success')
    except Exception as e:
        logger.error(f"Error deleting checklist: {e}")
        return dict(status='error', message=str(e))

# Ensure `edit_checklist` function exists and handles editing appropriately
@action('edit_checklist')
@action.uses('edit_checklist.html', db, auth.user)
def edit_checklist():
    checklist_id = request.params.get('id')
    if not checklist_id:
        abort(400, "Checklist ID is required")
    return dict(
        checklist_id=checklist_id,
        get_species_url=URL('get_species'),
        load_checklist_url=URL('load_checklist', checklist_id),
        update_checklist_url=URL('update_checklist'),
        my_checklists_url = URL('my_checklists', signer=url_signer)
    )



@action('get_birds_by_event', method=["POST"])
@action.uses(db, auth.user)
def get_birds_by_event():
    try:
        data = request.json
        sampling_event_id = data.get('sampling_event_id')
        birds = db(db.sightings.sampling_event_id == sampling_event_id).select()
        bird_counts = {bird.common_name: bird.observation_count for bird in birds}
        return dict(status='success', bird_counts=bird_counts)
    except Exception as e:
        logger.error(f"Error retrieving birds: {e}")
        return dict(status='error', message=str(e))


@action('load_checklist/<checklist_id>', method='GET')
@action.uses(db, auth.user)
def load_checklist(checklist_id=None):
    checklist = db(db.checklists.id == checklist_id).select().first()
    if checklist:
        sightings = db(db.sightings.sampling_event_id == checklist.sampling_event_id).select()
        return dict(checklist=checklist, sightings=sightings)
    return dict(error="Checklist not found")

@action('update_checklist', method='POST')
@action.uses(db, auth.user)
def update_checklist():
    data = request.json
    checklist_id = data.get('checklist_id')
    checklist_data = data.get('data', {}).get('checklist')
    sightings_data = data.get('data', {}).get('sightings')

    if checklist_id and checklist_data and sightings_data:
        db(db.checklists.id == checklist_id).update(**checklist_data)

        # Get existing sightings
        existing_sightings = db(db.sightings.sampling_event_id == checklist_data['sampling_event_id']).select()

        # Update existing sightings and insert new ones
        updated_sighting_ids = []
        for sighting in sightings_data:
            if sighting.get('id'):
                db(db.sightings.id == sighting['id']).update(observation_count=sighting['number'])
                updated_sighting_ids.append(sighting['id'])
            else:
                new_sighting_id = db.sightings.insert(sampling_event_id=checklist_data['sampling_event_id'],
                                                      common_name=sighting['species_name'],
                                                      observation_count=sighting['number'])
                updated_sighting_ids.append(new_sighting_id)

        # Delete sightings that are no longer in the updated checklist
        for existing_sighting in existing_sightings:
            if existing_sighting.id not in updated_sighting_ids:
                db(db.sightings.id == existing_sighting.id).delete()

        return dict(success=True)
    return dict(success=False, error="Invalid data")

@action('find_species', method='GET')
@action.uses(db)
def find_species():
    query = request.params.get('query', '')
    species = db(db.species.bird_name.like(f'%{query}%')).select()
    return dict(species=species)

@action('total_hours', method='GET')
@action.uses(db, auth.user)
def total_hours():
    checklists = db(db.checklists.observer_id == auth.current_user['email']).select()
    total_hours = sum([checklist.duration for checklist in checklists])
    return dict(total_hours=total_hours)




