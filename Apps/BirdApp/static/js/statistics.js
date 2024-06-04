"use strict";

// This will be the object that will contain the Vue attributes
// and be used to initialize it.
let app = {};

app.data = {
    data: function () {
        return {
            speciesList: [],
            searchQuery: '',
            sightingsOverTime: [],
            selectedSpecies: '',
        };
    },
    computed: {
        filteredSpecies() {
            const query = this.searchQuery.toLowerCase();
            return this.speciesList.filter(species =>
                species.common_name && species.common_name.toLowerCase().includes(query)
            );
        },
        speciesSightings() {
            if (!this.selectedSpecies) return [];
            return this.sightingsOverTime.filter(sighting =>
                sighting.sightings.common_name === this.selectedSpecies
            );
        }
    },
    methods: {
        loadData() {
            // Replace single quotes with double quotes and parse the JSON string
            let speciesJsonString = species_seen.replace(/'/g, '"');
            this.speciesList = JSON.parse(speciesJsonString);

            // Replace single quotes with double quotes and parse the JSON string
            let sightingsJsonString = sightings_over_time.replace(/'/g, '"');

            // Replace datetime.date(YYYY, M, D) with "YYYY-MM-DD"
            sightingsJsonString = sightingsJsonString.replace(/datetime.date\((\d+), (\d+), (\d+)\)/g, '"$1-$2-$3"');

            // Parse the JSON string
            this.sightingsOverTime = JSON.parse(sightingsJsonString);

            console.log("Loaded Species List:", this.speciesList);
            console.log("Loaded Sightings Over Time:", this.sightingsOverTime);
        },
        selectSpecies(speciesName) {
            this.selectedSpecies = speciesName;
            this.$nextTick(() => {
                this.visualizeTime();
            });
        },
        visualizeTime() {
            const timeVisualization = document.getElementById('time-visualization');
            if (!timeVisualization) {
                console.error("Element with ID 'time-visualization' not found");
                return;
            }
            timeVisualization.innerHTML = ''; // Clear previous content

            const data = this.speciesSightings.map(sighting => ({
                date: new Date(sighting.checklists.observation_date),
                count: sighting.sightings.observation_count
            }));

            // Set the dimensions and margins of the graph
            const margin = { top: 10, right: 30, bottom: 30, left: 60 },
                width = 800 - margin.left - margin.right,
                height = 400 - margin.top - margin.bottom;

            // Append the svg object to the div called 'time-visualization'
            const svg = d3.select("#time-visualization")
                .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

            // Add X axis
            const x = d3.scaleTime()
                .domain(d3.extent(data, d => d.date))
                .range([0, width]);
            svg.append("g")
                .attr("transform", `translate(0,${height})`)
                .call(d3.axisBottom(x));

            // Add Y axis
            const y = d3.scaleLinear()
                .domain([0, d3.max(data, d => d.count)])
                .range([height, 0]);
            svg.append("g")
                .call(d3.axisLeft(y));

            // Add the line
            svg.append("path")
                .datum(data)
                .attr("fill", "none")
                .attr("stroke", "steelblue")
                .attr("stroke-width", 1.5)
                .attr("d", d3.line()
                    .x(d => x(d.date))
                    .y(d => y(d.count))
                );

            // Add the points
            svg.append("g")
                .selectAll("dot")
                .data(data)
                .enter()
                .append("circle")
                .attr("cx", d => x(d.date))
                .attr("cy", d => y(d.count))
                .attr("r", 3)
                .attr("fill", "#69b3a2");
        }
    },
    mounted() {
        this.loadData();
    }
};

app.vue = Vue.createApp(app.data).mount("#app");
