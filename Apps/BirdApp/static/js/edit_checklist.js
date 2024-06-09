"use strict";

// This will be the object that will contain the Vue attributes
// and be used to initialize it.
let app = {};

app.data = {    
    data: function() {
        return {
            checklist: {},
            addedSpecies: [],
            searchQuery: '',
            species: [],
            closestMatches: [],
            showMatches: false,
            date: '',
            duration: ''
        };
    },
    watch: {
        searchQuery: function(val) {
            if (val.length > 0) {
                this.searchSpecies();
            } else {
                this.showMatches = false;
                this.closestMatches = [];
            }
        }
    },
    methods: {
        loadChecklist: function() {
            axios.get(load_checklist_url)
                .then(response => {
                    const data = response.data;
                    if (data.checklist) {
                        this.checklist = data.checklist;
                        this.addedSpecies = data.sightings.map(sighting => ({
                            id: sighting.id,
                            name: sighting.common_name,
                            count: sighting.observation_count
                        }));
                        this.date = data.checklist.observation_date;
                        this.duration = data.checklist.duration;
                    } else {
                        alert('Failed to load checklist');
                    }
                })
                .catch(error => {
                    console.error('Error loading checklist:', error);
                });
        },
        searchSpecies: function() {
            axios.get(find_species_url, { params: { query: this.searchQuery } })
                .then(response => {
                    this.closestMatches = response.data.species.map(bird => bird.bird_name);
                    this.showMatches = true;
                })
                .catch(error => {
                    console.error('Error searching species:', error);
                });
        },
        addSpecies: function(species) {
            if (!this.addedSpecies.some(s => s.name === species)) {
                this.addedSpecies.push({ id: null, name: species, count: 1 });
            }
            this.searchQuery = '';
            this.showMatches = false;
        },
        incCount: function(species) {
            species.count++;
        },
        decCount: function(species) {
            if (species.count > 0) {
                species.count--;
            }
        },
        deleteSpecies: function(species) {
            this.addedSpecies = this.addedSpecies.filter(s => s !== species);
        },
        updateChecklist: function() {
            const data = {
                checklist: {
                    observation_date: this.date,
                    duration: this.duration,
                    sampling_event_id: this.checklist.sampling_event_id
                },
                sightings: this.addedSpecies.map(s => ({
                    id: s.id,
                    species_name: s.name,
                    number: s.count
                }))
            };
            axios.post(update_checklist_url, { checklist_id: checklist_id, data: data })
                .then(response => {
                    if (response.data.success) {
                        window.location.href = '/BirdApp/my_checklists';
                    } else {
                        alert('Failed to update checklist');
                    }
                })
                .catch(error => {
                    console.error('Error updating checklist:', error);
                });
        },
        viewMyChecklists: function() {
            window.location.href = '/BirdApp/my_checklists';
        },
        checkFloat: function(event) {
            let value = event.target.value;
            if (!/^\d*\.?\d*$/.test(value)) {
                event.target.value = value.slice(0, -1);
            }
        }
    }
};

app.vue = Vue.createApp(app.data).mount("#app");

app.load_data = function () {
    app.vue.loadChecklist();
};

app.load_data();
