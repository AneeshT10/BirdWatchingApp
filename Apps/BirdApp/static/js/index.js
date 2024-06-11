"use strict";

// This will be the object that will contain the Vue attributes
// and be used to initialize it.
let app = {};


app.data = {    
    data: function() {
        return {
            map: null,
            my_value: 1,
            searchQuery: '',
            species: [],
            closestMatches: [],
            selected_bird: '',
            showMatches: false,
            heatmap_cords: [],
        };
    },
    //Function allowing to display closest matches to
    // user's current input in search bar
    watch: {
        searchQuery: function(val) {
            this.closestMatches = this.getClosestMatches(val);
            this.showMatches = true;
        }
    },
    methods: {
        //Function allowing to redirect to the statistics page
        goToUserStats: function() {
            window.location.href = stats_url;
        },
        //Function allowing to redirect to the checklist page
        goToMyChecklists: function() {
            window.location.href = my_checklists_url;
        },
        //Function that returns the closest matches to the user's input
        getClosestMatches: function(query) {
            if (!query) return [];
            let matches = this.species.filter(species => species.toLowerCase().includes(query.toLowerCase()));
            return matches;
        },
        //Function that allows to select a bird from the search bar
        select_bird: function(bird) {
            this.searchQuery = bird;
            this.$nextTick(() => {
                this.showMatches = false;
            });
            this.selected_bird = bird;

            // Get event_ids where bird names match
            axios.get(get_sightings_url, {
                params: {
                    bird_name: bird,
                    heatmap: true
                }
            }).then((response) => {
                let event_ids = response.data.sightings.map(sighting => sighting.sampling_event_id);
                // Get checklists where event_ids match
                axios.get(get_checklists_url, {
                    params: {
                        event_ids: event_ids.join(',')
                    }
                }).then((response2) => {
                    let heatmap_cords = response2.data.checklists.map(checklist => [checklist.lat, checklist.lng, 0.2]);
                    // Update heatmap
                    app.heatmap.setLatLngs(heatmap_cords);
                });
            });
        },
        //Function that allows to clear the search bar and reset heatmap 
        redo: function() {
            // Get all checklists
            axios.get(get_checklists_url).then((response) => {
                let heatmap_cords = response.data.checklists.map(checklist => [checklist.lat, checklist.lng, 0.2]);
                // Update heatmap
                app.heatmap.setLatLngs(heatmap_cords);
            });
            this.searchQuery = '';
        },
    },
};
app.vue = Vue.createApp(app.data).mount("#app");

app.load_data = function () {
    //Load species data
    axios.get(get_species_url).then(function (r) {
        app.vue.species = r.data.species.map(function(bird) {
            return bird.bird_name;
        });
    });

    //Load data for heatmap
    axios.get(get_checklists_url).then(function (r) {
        app.vue.heatmap_cords = r.data.checklists.map(function(checklist) {
            return [checklist.lat, checklist.lng, 0.2];
        });
        app.heatmap.setLatLngs(app.vue.heatmap_cords);
    });

}

app.init = () => {
    app.map = L.map('map');
    // Add loading screen to map, wait for map to initialize and load map
    app.map.on('load', function() {
        document.getElementById('loading').style.display = 'none';
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(app.map);
    app.map.locate({setView: true, maxZoom: 13});

    app.map.on('locationfound', function(e){
    });
    app.map.on('locationerror', function(e){
        alert(e.message);
    });

    // Initialize the FeatureGroup to store editable layers
    var editableLayers = new L.FeatureGroup();
    app.map.addLayer(editableLayers);

    // Add heatmap layer
    app.heatmap = L.heatLayer([], {radius: 25, max: 1}).addTo(app.map);

    // Initialize the draw control and pass it the FeatureGroup of editable layers
    var drawControl = new L.Control.Draw({
        edit: {
            featureGroup: editableLayers
        },
        draw: {
            polyline: false,
            polygon: false,
            circle: false,
            marker: true,
            rectangle: true
        }
    });
    app.map.addControl(drawControl);
    let locateControl = L.control({position: 'topleft'});

    locateControl.onAdd = function (map) {
        let div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
        div.style.backgroundColor = 'white';
        div.style.backgroundImage = "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 36 36\"><text x=\"45%\" y=\"55%\" dominant-baseline=\"middle\" text-anchor=\"middle\" fill=\"black\" font-size=\"30\">🏠</text></svg>')"; 
        div.style.backgroundSize = '30px 30px';
        div.style.width = '30px';
        div.style.height = '30px';
    
        div.onclick = function(){
            map.locate({setView: true, maxZoom: 16});
        }
    
        return div;
    };
    
    // Add the control to the map
    locateControl.addTo(app.map);
    app.map.on('draw:created', function(e) {
        var type = e.layerType,
            layer = e.layer;  
        //Drawing a rectangle on map
        if (type === 'rectangle') {
            var popupContent = '<button class="button"id="stats-button">Statistics on region</button>';
            var popup = L.popup().setContent(popupContent);
            layer.bindPopup(popup);
            layer.on('click', function() { 
                layer.openPopup();
                document.getElementById('stats-button').layer = layer;
            });
        }
        //Placing a marker on map
        if (type === "marker") {
            var popupContent = '<button class="button"id="checklist">Enter checklist</button>';
            var popup = L.popup().setContent(popupContent);
            layer.bindPopup(popup);
            layer.on('click', function() { 
                layer.openPopup();
                document.getElementById('checklist').layer = layer;
            });
        }
    
        // Add the layer to the editable layers
        editableLayers.addLayer(layer);
    });
};


app.init();

app.load_data();

document.addEventListener('click', function(e) {
    if (e.target.id === 'stats-button') {
        // Get the layer of the clicked button
        var layer = e.target.layer
        if (layer) {
            // Get the bounds of the rectangle
            var bounds = layer.getBounds();
            // Get the coordinates of the corners of the rectangle
            var southWest = bounds.getSouthWest();
            var northEast = bounds.getNorthEast();
            var northWest = bounds.getNorthWest();
            var southEast = bounds.getSouthEast();

            // Redirect to location page with the coordinates as parameters
            window.location.href = '/BirdApp/location?' +
                'swLat=' + southWest.lat + '&swLng=' + southWest.lng +
                '&nwLat=' + northWest.lat + '&nwLng=' + northWest.lng +
                '&neLat=' + northEast.lat + '&neLng=' + northEast.lng +
                '&seLat=' + southEast.lat + '&seLng=' + southEast.lng;
        }
    }

    //Added to send the lat lng to the checklist page
    if (e.target.id === 'checklist') {
        var layer = e.target.layer;
        if (layer) {
            var latLng = layer.getLatLng();
            // Redirect to checklist page with lat and lng as parameters
            window.location.href = '/BirdApp/checklist?' + 'lat=' + latLng.lat + '&lng=' + latLng.lng;
        }
    }   
});
