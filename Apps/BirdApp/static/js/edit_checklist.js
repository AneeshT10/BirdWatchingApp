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
    //Function allowing to display closest matches to
    // user's current input in search bar
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
        //Function to load the checklist
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
        //Function allowing to display closest matches to user bird search input
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
        //Function allowing to add a species to the checklist
        addSpecies: function(species) {
            if (!this.addedSpecies.some(s => s.name === species)) {
                this.addedSpecies.push({ id: null, name: species, count: 1 });
            }
            this.searchQuery = '';
            this.showMatches = false;
        },
        //Function to increment the count of a species
        incCount: function(species) {
            species.count++;
        },
        //Function to decrement the count of a species
        decCount: function(species) {
            if (species.count > 0) {
                species.count--;
            }
        },
        //Function to delete a species from the checklist
        deleteSpecies: function(species) {
            this.addedSpecies = this.addedSpecies.filter(s => s !== species);
        },
        //Function to update and submit the changed checklist
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
                        window.location.href = my_checklist_url;
                    } else {
                        alert('Failed to update checklist');
                    }
                })
                .catch(error => {
                    console.error('Error updating checklist:', error);
                });
        },
        //Function that redirects user to their checklists
        viewMyChecklists: function() {
            window.location.href = my_checklist_url;
        },
        //Function to check if the input is a float
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
