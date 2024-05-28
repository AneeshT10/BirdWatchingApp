"use strict";

// This will be the object that will contain the Vue attributes
// and be used to initialize it.
let app = {};

app.data = {
    data: function () {
        return {
            speciesList: [],
            searchQuery: '',
            sightings: [],
            selectedSpecies: '',
            my_value: 1, // Example value
        };
    },
    computed: {
        filteredSpecies() {
            const query = this.searchQuery.toLowerCase();
            return this.speciesList.filter(species =>
                species.bird_name.toLowerCase().includes(query)
            );
        }
    },
    methods: {
        fetchSpecies() {
            axios.get(get_species_url)
                .then(response => {
                    this.speciesList = response.data.species;
                });
        },
        fetchSightings(speciesName) {
            axios.get(get_sightings_url + `?bird_name=${speciesName}`)
                .then(response => {
                    this.sightings = response.data.sightings;
                    this.selectedSpecies = speciesName;
                    this.visualizeTime();
                    this.visualizeMap();
                });
        },
        visualizeTime() {
            const timeVisualization = document.getElementById('time-visualization');
            d3.select(timeVisualization).selectAll('*').remove();
            const margin = { top: 20, right: 30, bottom: 30, left: 40 };
            const width = 800 - margin.left - margin.right;
            const height = 400 - margin.top - margin.bottom;

            const svg = d3.select(timeVisualization)
                .append('svg')
                .attr('width', width + margin.left + margin.right)
                .attr('height', height + margin.top + margin.bottom)
                .append('g')
                .attr('transform', `translate(${margin.left},${margin.top})`);

            const x = d3.scaleTime()
                .domain(d3.extent(this.sightings, d => new Date(d.observation_date)))
                .range([0, width]);

            svg.append('g')
                .attr('transform', `translate(0,${height})`)
                .call(d3.axisBottom(x));

            const y = d3.scaleLinear()
                .domain([0, d3.max(this.sightings, d => d.observation_count)])
                .nice()
                .range([height, 0]);

            svg.append('g')
                .call(d3.axisLeft(y));

            svg.append('path')
                .datum(this.sightings)
                .attr('fill', 'none')
                .attr('stroke', 'steelblue')
                .attr('stroke-width', 1.5)
                .attr('d', d3.line()
                    .x(d => x(new Date(d.observation_date)))
                    .y(d => y(d.observation_count))
                );
        },
        visualizeMap() {
            const mapContainer = document.getElementById('map');
            mapContainer.innerHTML = '';
            const map = new google.maps.Map(mapContainer, {
                zoom: 4,
                center: { lat: 37.7749, lng: -122.4194 }  // Default center
            });

            this.sightings.forEach(sighting => {
                const marker = new google.maps.Marker({
                    position: { lat: sighting.lat, lng: sighting.lng },
                    map: map,
                    title: sighting.common_name
                });
            });
        },
        loadData() {
            axios.get(my_callback_url).then(response => {
                this.my_value = response.data.my_value;
            });
        },
        my_function() {
            this.my_value += 1;
        }
    },
    mounted() {
        this.fetchSpecies();
        this.loadData();
    }
};

app.vue = Vue.createApp(app.data).mount("#app");
