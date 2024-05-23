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

url_signer = URLSigner(session)

@action('index')
@action.uses('index.html', db, auth, url_signer)
def index():
    load_csv_files()
    return dict(
        # COMPLETE: return here any signed URLs you need.
        my_callback_url = URL('my_callback', signer=url_signer),
        get_species_url = URL('get_species', signer=url_signer)
    )

@action('location')
#@action('statistics?<swLat:float>&<swLng:float>&<nwLat:float>&<nwLng:float>&<neLat:float>&<neLng:float>&<seLat:float>&<seLng:float>')
@action.uses('location.html', db, auth.user, url_signer)
def statistics():
    #Loaded rectangle region
    swLat = float(request.params.get('swLat'))
    swLng = float(request.params.get('swLng'))
    nwLat = float(request.params.get('nwLat'))
    nwLng = float(request.params.get('nwLng'))
    neLat = float(request.params.get('neLat'))
    neLng = float(request.params.get('neLng'))
    seLat = float(request.params.get('seLat'))
    seLng = float(request.params.get('seLng'))

    #Filter Stats located in this region
    

    return dict(
        # COMPLETE: return here any signed URLs you need.
        my_callback_url = URL('my_callback', signer=url_signer),
        swLat = swLat,
        swLng = swLng,
        nwLat = nwLat,
        nwLng = nwLng,
        neLat = neLat,
        neLng = neLng,
        seLat = seLat,
        seLng = seLng
            
    )

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
def get_sightings():
    sightings = db(db.sightings).select().as_list()
    return dict(sightings=sightings)

@action('get_checklists')
def get_checklists():
    checklists = db(db.checklists).select().as_list()
    return dict(checklists=checklists)
