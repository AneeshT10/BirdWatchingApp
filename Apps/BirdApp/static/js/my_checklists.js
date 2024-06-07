"use strict";

// This will be the object that will contain the Vue attributes
// and be used to initialize it.
let app = {};

// Define the Vue data and methods
app.data = {
    checklists: []
};

app.methods = {
    getBirdsByEvent: function(sampling_event_id) {
        return axios.post('/BirdApp/get_birds_by_event', { sampling_event_id: sampling_event_id })
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
    initMap: function(checklist) {
        console.log('initMap', checklist.id, checklist.lat, checklist.lng)
        var map = L.map('map' + checklist.id).setView([checklist.lat, checklist.lng], 11);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png', {
            subdomains: 'abcd',
            maxZoom: 16
        }).addTo(map);

        L.marker([checklist.lat, checklist.lng]).addTo(map);
    },
    loadChecklists() {
        axios.get('/BirdApp/get_my_checklists')
            .then(response => {
                this.checklists = response.data.checklists;
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
        console.log("Checklist", this.checklists)
    },
    deleteChecklist(id) {
        axios.post('/BirdApp/delete_checklist', { id: id })
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
