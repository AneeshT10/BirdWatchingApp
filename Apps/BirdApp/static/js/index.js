"use strict";

// This will be the object that will contain the Vue attributes
// and be used to initialize it.
let app = {};


app.data = {    
    data: function() {
        return {
            // Complete as you see fit.
            map: null,
            my_value: 1,
            show_stat_button: false // This is an example.
        };
    },
    methods: {
        // Complete as you see fit.
        my_function: function() {
            // This is an example.
            this.my_value += 1;
        },
    },
};
app.vue = Vue.createApp(app.data).mount("#app");

app.load_data = function () {
    axios.get(my_callback_url).then(function (r) {
        app.vue.my_value = r.data.my_value;
    });


    // var map = L.map('map').setView([51.505, -0.09], 13);

    // L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    //     attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    // }).addTo(map);

    // L.marker([51.5, -0.09]).addTo(map)
    //     .bindPopup('A pretty CSS popup.<br> Easily customizable.')
    //     .openPopup();
        
}

app.init = () => {
    app.map = L.map('map').setView([51.505, -0.09], 13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(app.map);
    // Adds listener.
    // app.map.on('click', app.click_listener);
    // app.map.on('dbclick', app.dbclick_listener);

    app.map.locate({setView: true, maxZoom: 13});

    app.map.on('locationfound', function(e){
        L.marker(e.latlng).addTo(app.map)
            // .bindPopup("You are located here!").openPopup();
    });
    app.map.on('locationerror', function(e){
        alert(e.message);
    });

    // Initialize the FeatureGroup to store editable layers
    var editableLayers = new L.FeatureGroup();
    app.map.addLayer(editableLayers);

    // Initialize the draw control and pass it the FeatureGroup of editable layers
    var drawControl = new L.Control.Draw({
        edit: {
            featureGroup: editableLayers
        },
        draw: {
            polyline: false,
            polygon: false,
            circle: false,
            marker: false,
            rectangle: true
        }
    });
    app.map.addControl(drawControl);

    app.map.on('draw:created', function(e) {
        var type = e.layerType,
            layer = e.layer;
    
        if (type === 'rectangle') {
            var popupContent = '<button class="button"id="stats-button">Statistics on region</button>';
            var popup = L.popup().setContent(popupContent);
            layer.bindPopup(popup);
            layer.on('click', function() { 
                layer.openPopup();
                document.getElementById('stats-button').layer = layer;
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
        console.log("Button clicked");
        // Get the layer of the clicked button
        var layer = e.target.layer
        console.log(layer);
        if (layer) {
            // Get the bounds of the rectangle
            var bounds = layer.getBounds();
            // Get the south-west and north-east points of the bounds
            var southWest = bounds.getSouthWest();
            var northEast = bounds.getNorthEast();
            var northWest = bounds.getNorthWest();
            var southEast = bounds.getSouthEast();

            // Log the latitude and longitude data
            //console.log('South-west point:', southWest.lat, southWest.lng);
            //console.log('North-east point:', northEast.lat, northEast.lng);
            //console.log('North-west point:', northWest.lat, northWest.lng);
            //console.log('South-east point:', southEast.lat, southEast.lng);
            // Perform an action with the latitude and longitude data
            // ...

            //redirect
            window.location.href = '/BirdApp/statistics?' +
                'swLat=' + southWest.lat + '&swLng=' + southWest.lng +
                '&nwLat=' + northWest.lat + '&nwLng=' + northWest.lng +
                '&neLat=' + northEast.lat + '&neLng=' + northEast.lng +
                '&seLat=' + southEast.lat + '&seLng=' + southEast.lng;
        }

        

    }
});
