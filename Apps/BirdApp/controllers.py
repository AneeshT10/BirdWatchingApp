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
    print(species_stats_json)
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
    #print("LENGTH OF CHECK",len(checklists))
    return dict(checklists=checklists)


