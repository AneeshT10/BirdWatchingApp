"""
This file defines the database models
"""

import datetime
from .common import db, Field, auth
from pydal.validators import *
import csv
import os


def get_user_email():
    return auth.current_user.get('email') if auth.current_user else None

def get_time():
    return datetime.datetime.utcnow()

def load_csv_files(): # Prime the database with the data from the csv files
    if db(db.species).isempty():
        with open('species.csv', 'r') as f:
            reader = csv.reader(f)
            skip = 0
            for row in reader:
                if skip == 0:
                    skip += 1
                    continue
                db.species.insert(bird_name=row[0])
    
    if db(db.sightings).isempty():
        with open('sightings.csv', 'r') as f:
            reader = csv.reader(f)
            skip = 0
            for row in reader:
                if skip == 0:
                    skip += 1
                    continue
                try:
                    observation_count = int(row[2])
                except ValueError:
                    observation_count = 0  # or some default value
                db.sightings.insert(sampling_event_id=row[0], common_name=row[1], observation_count=observation_count)

    if db(db.checklists).isempty():
        with open('checklists.csv', 'r') as f:
            reader = csv.reader(f)
            skip = 0
            for row in reader:
                if skip == 0:
                    skip += 1
                    continue
                if row[6] == '':
                    dur = 0.0
                else:
                    dur = float(row[6])
                db.checklists.insert(sampling_event_id=row[0], lat=float(row[1]), lng=float(row[2]), observation_date=row[3], observation_time=row[4], observer_id=row[5], duration=dur)

db.define_table('species',
                Field('bird_name', 'string')
)
db.define_table('sightings',
                Field('sampling_event_id'),
                Field('common_name'),
                Field('observation_count', 'integer')
)
db.define_table('checklists',
                Field('sampling_event_id'),
                Field('lat', 'float'),
                Field('lng', 'float'),
                Field('observation_date', 'date'),
                Field('observation_time', 'time'),
                Field('observer_id'),
                Field('duration','float')

)

db.commit()
