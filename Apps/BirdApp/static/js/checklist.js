"use strict";

// This will be the object that will contain the Vue attributes
// and be used to initialize it.
let app = {};

// Function to get query parameters from the URL
function getQueryParams() {
    let params = {};
    let queryString = window.location.search.slice(1);
    let pairs = queryString.split('&');
    pairs.forEach(pair => {
        let [key, value] = pair.split('=');
        params[decodeURIComponent(key)] = decodeURIComponent(value);
    });
    return params;
}

// Define the Vue data and methods
app.data = {
    data: function () {
        return {
            searchQuery: '',
            species: [],
            selectedSpecies: '',
            checklist: [],
            lat: '',
            lng: '',
            date: '',
            speciesTable: '',
            myChecklists: [],
            closestMatches: [],
            showMatches: false,
            addedSpecies: [],
            duration: '',
        };
    },
    //Function allowing to display closest matches to
    // user's current input in search bar
    watch: {
        searchQuery: function (val) {
            this.closestMatches = this.getClosestMatches(val);
            this.showMatches = true;
        }
    },
    methods: {
        //Check if the input is a float number
        checkFloat: function (event) {
            if (!/^\d*\.?\d*$/.test(event.target.value)) {
                this.duration = this.duration.slice(0, -1);
            }
        },
        //Function to delete species from a checklist
        deleteSpecies: function (species) {
            const index = this.addedSpecies.indexOf(species);
            if (index !== -1) {
                this.addedSpecies.splice(index, 1);
            }
        },
        //Function to add species to a checklist
        addSpecies: function (species) {
            let existingSpecies = this.addedSpecies.find(s => s.name === species);
            if (existingSpecies) {
                existingSpecies.count++;
            } else {
                this.addedSpecies.push({ name: species, count: 1 });
            }
            this.searchQuery = '';
        },
        //Function to increment the count of a species
        incCount: function (species) {
            species.count++;
        },
        //Function to decrement the count of a species
        decCount: function (species) {
            if (species.count > 0) {
                species.count--;
            }
        },
        //Function that returns the closest matches to the user's bird search input
        getClosestMatches: function (query) {
            if (!query) return [];
            let matches = this.species.filter(species => species.toLowerCase().includes(query.toLowerCase()));
            return matches;
        },
        //Function that allows user to submit their checklist
        submitChecklist() {
            if (this.lat.trim() === '' || this.lng.trim() === '' || this.date.trim() === '' || this.duration.trim() === '') {
                alert('Please fill out all fields before submitting the checklist.');
                return;
            }
            //POST reqquest to submit the checklist
            axios.post(submit_checklist_url, {
                lat: this.lat,
                lng: this.lng,
                date: this.date,
                duration: this.duration,
                sightings: app.vue.addedSpecies,
            }).then(response => {
                if (response.data.status === 'success') {
                    alert('Checklist submitted successfully');
                    this.checklist = [];
                    //this.lat = '';
                    //this.lng = '';
                    this.date = '';
                    this.duration = '';
                    this.addedSpecies = [];
                } else {
                    alert(`Error: ${response.data.message}`);
                }
            }).catch(error => {
                console.error("There was an error submitting the checklist:", error);
                alert('There was an error submitting the checklist. Please try again.');
            });
        },

        //Function that redirects user to their checklists
        viewMyChecklists() {
            window.location.href = my_checklist_url;
        }
    }
};
app.vue = Vue.createApp(app.data).mount("#app");

// Function to load initial data
app.load_data = function () {
    let params = getQueryParams();
    if (params.lat && params.lng) {
        app.vue.lat = params.lat;
        app.vue.lng = params.lng;
    }
    axios.get(get_species_url).then(function (r) {
        app.vue.species = r.data.species.map(function (bird) {
            return bird.bird_name;
        });
    });
}

// Load initial data 
app.load_data();
