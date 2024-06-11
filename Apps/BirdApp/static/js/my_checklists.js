"use strict";

// This will be the object that will contain the Vue attributes
// and be used to initialize it.
let app = {};

// Define the Vue data and methods
app.data = {
    checklists: []
};

app.methods = {
    // Function to get the birds for a specific event
    getBirdsByEvent: function(sampling_event_id) {
        return axios.post(get_birds_by_event_url, { sampling_event_id: sampling_event_id })
            .then(response => {
                if (response.data.status === 'success') {
                    return response.data.bird_counts;
                } else {
                    throw new Error(response.data.message);
                }
            })
            .catch(error => {
                console.error("There was an error fetching the birds:", error);
            });
    },
    // Function to initialize a mini-map for each checklist
    initMap: function(checklist) {
        var map = L.map('map' + checklist.id).setView([checklist.lat, checklist.lng], 11);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png', {
            subdomains: 'abcd',
            maxZoom: 16
        }).addTo(map);

        L.marker([checklist.lat, checklist.lng]).addTo(map);
    },
    //Load checklists
    loadChecklists() {
        axios.get(get_my_checklists_url)
            .then(response => {
                // Sort the checklists by date
                this.checklists = response.data.checklists.sort((a, b) => {
                    return new Date(b.observation_date) - new Date(a.observation_date);
                });
    
                return Promise.all(this.checklists.map(checklist => 
                    this.getBirdsByEvent(checklist.sampling_event_id).then(bird_counts => {
                        checklist.bird_counts = bird_counts;
                    })
                ));
            })
            .then(() => {
                this.$nextTick(() => {
                    this.checklists.forEach(this.initMap);
                });
            })
            .catch(error => {
                console.error("There was an error fetching the checklists:", error);
            });
    },
    // Function to delete a checklist
    deleteChecklist(id) {
        axios.post(delete_checklist_url, { id: id })
            .then(response => {
                if (response.data.status === 'success') {
                    this.loadChecklists();
                } else {
                    alert('Error deleting checklist');
                }
            })
            .catch(error => {
                console.error("There was an error deleting the checklist:", error);
            });
    },
    editChecklist(id) {
        // Logic to navigate to the edit checklist page
        window.location.href = `/BirdApp/edit_checklist?id=${id}`;
    }
};

// Create the Vue instance and mount it to the DOM element with id="app"
app.vue = Vue.createApp({
    data() {
        return app.data;
    },
    methods: app.methods,
    mounted() {
        this.loadChecklists();
    }
}).mount('#app');
