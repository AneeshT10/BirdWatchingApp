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
    data: function() {
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
    watch: {
        searchQuery: function(val) {
            this.closestMatches = this.getClosestMatches(val);
            this.showMatches = true;
        }
    },
    methods:{
        checkFloat: function(event) {
            if (!/^\d*\.?\d*$/.test(event.target.value)) {
                this.duration = this.duration.slice(0, -1);
            }
        },
        deleteSpecies: function(species) {
            const index = this.addedSpecies.indexOf(species);
            if (index !== -1) {
                this.addedSpecies.splice(index, 1);
            }
        },
        addSpecies: function(species) {
            let existingSpecies = this.addedSpecies.find(s => s.name === species);
            if (existingSpecies) {
                existingSpecies.count++;
            } else {
                this.addedSpecies.push({ name: species, count: 1 });
            }
            this.searchQuery = '';
        },
        incCount: function(species) {
            //console.log("increase")
            species.count++;
        },
        decCount: function(species) {
            if (species.count > 0) {
                //console.log("decrease")
                species.count--;
            }
        },
        getClosestMatches: function(query) {
            if (!query) return [];
            let matches = this.species.filter(species => species.toLowerCase().includes(query.toLowerCase()));
            return matches;
        },
        searchSpecies() {
            if (this.selectedSpecies.trim() === '') {
                this.species = [];
                return;
            }
            axios.get('/BirdApp/search_species', { params: { query: this.selectedSpecies } })
                .then(response => {
                    this.species = response.data.species;
                })
                .catch(error => {
                    console.error("There was an error searching for species:", error);
                });
        },
        getCount(species_id) {
            let item = this.checklist.find(item => item.species_id === species_id);
            return item ? item.number_seen : 0;
        },
        addSpeciesToChecklist(species) {
            if (!this.checklist.some(item => item.species_id === species.id)) {
                this.checklist.push({ species_id: species.id, name: species.bird_name, number_seen: 0 });
            }
            this.selectedSpecies = '';
            this.species = [];
        },
        // incrementCount(species_id) {
        //     let item = this.checklist.find(item => item.species_id === species_id);
        //     if (item) {
        //         item.number_seen++;
        //     } else {
        //         this.checklist.push({ species_id, name: species_id, number_seen: 1 });
        //     }
        // },
        submitChecklist() {
            console.log(app.vue.addedSpecies);
            console.log("Submitting checklist with data:", {
                lat: this.lat,
                lng: this.lng,
                date: this.date,
                duration: this.duration,
                sightings: app.vue.addedSpecies,
            });
            
            if (this.lat.trim() === '' || this.lng.trim() === '' || this.date.trim() === '' || this.duration.trim() === '') {
                alert('Please fill out all fields before submitting the checklist.');
                return;
            }
            
            axios.post('/BirdApp/submit_checklist', {
                lat: this.lat,
                lng: this.lng,
                date: this.date,
                duration: this.duration,
                sightings: app.vue.addedSpecies,
            }).then(response => {
                if (response.data.status === 'success') {
                    alert('Checklist submitted successfully');
                    this.checklist = [];
                    this.lat = '';
                    this.lng = '';
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
        loadMyChecklists() {
            axios.get('/BirdApp/get_my_checklists')
                .then(response => {
                    this.myChecklists = response.data.checklists;
                })
                .catch(error => {
                    console.error("There was an error fetching the checklists:", error);
                });
        },
        viewMyChecklists() {
            window.location.href = '/BirdApp/my_checklists';
        }

    }
};

// Create the Vue instance and mount it to the DOM element with id="app"
// app.vue = Vue.createApp({
//     data() {
//         return app.data;
//     },
//     methods: app.methods,
//     mounted() {
//         let params = getQueryParams();
//         console.log("URL Parameters: ", params);
//         if (params.lat && params.lng) {
//             this.lat = params.lat;
//             this.lng = params.lng;
//             console.log("Latitude set to: ", this.lat);
//             console.log("Longitude set to: ", this.lng);
//         }
//         // this.loadMyChecklists();
//     }
// }).mount('#app');
app.vue = Vue.createApp(app.data).mount("#app");

// Function to load initial data
app.load_data = function () {
    let params = getQueryParams();
        console.log("URL Parameters: ", params);
        if (params.lat && params.lng) {
            app.vue.lat = params.lat;
            app.vue.lng = params.lng;
            console.log("Latitude set to: ", app.vue.lat);
            console.log("Longitude set to: ", app.vue.lng);
        }
    axios.get(get_species_url).then(function (r) {
        app.vue.species = r.data.species.map(function(bird) {
            return bird.bird_name;
        });
    });

    axios.get(my_callback_url).then(function (r) {
        app.vue.my_value = r.data.my_value;
    });
}

// Load initial data (if needed)
app.load_data();
