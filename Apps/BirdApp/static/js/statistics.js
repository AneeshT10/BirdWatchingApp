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
            sightingLocations: [],
            selectedSpecies: '',
            map: null,
            heatLayer: null,
            numberOfSightings: 0,
            totalHoursBirdWatched: 0.0,
            mostSeenBird: '',
        };
    },
    computed: {
        // Filter the species list based on the user's searches
        filteredSpecies() {
            const query = this.searchQuery.toLowerCase();
            return this.speciesList.filter(species =>
                species.common_name && species.common_name.toLowerCase().includes(query)
            );
        },
        // Filter the sightings based on the species searched by the user
        speciesSightings() {
            if (!this.selectedSpecies) return [];
            return this.sightingsOverTime.filter(sighting =>
                sighting.sightings.common_name === this.selectedSpecies
            );
        },
        // Function to help calculate and display the user's overall sightings over time
        overallSightings() {
            // Group data by date and sum the counts
            const grouped = this.sightingsOverTime.reduce((acc, sighting) => {
                const date = sighting.checklists.observation_date;
                if (!acc[date]) {
                    acc[date] = 0;
                }
                acc[date] += sighting.sightings.observation_count;
                return acc;
            }, {});

            // Convert to array of objects and sort by date
            const sortedData = Object.entries(grouped).map(([date, count]) => ({
                date: new Date(date),
                count
            })).sort((a, b) => a.date - b.date);

            // Create cumulative sum
            let cumulativeCount = 0;
            return sortedData.map(d => {
                cumulativeCount += d.count;
                return { date: d.date, count: cumulativeCount };
            });
        }
    },
    methods: {
        loadData() {
            // Replace single quotes with double quotes and parse the JSON string
            let speciesJsonString = species_seen.replace(/(\W)'|'(\W)/g, '$1"$2');
            this.speciesList = JSON.parse(speciesJsonString);

            // Replace single quotes with double quotes and parse the JSON string
            let sightingsJsonString = sightings_over_time.replace(/(\W)'|'(\W)/g, '$1"$2');

            // Replace datetime.date(YYYY, M, D) with "YYYY-MM-DD"
            sightingsJsonString = sightingsJsonString.replace(/datetime.date\((\d+), (\d+), (\d+)\)/g, '"$1-$2-$3"');

            // Parse the JSON string
            this.sightingsOverTime = JSON.parse(sightingsJsonString);

            // Replace single quotes with double quotes and parse the JSON string for sighting locations
            let locationsJsonString = sighting_locations.replace(/(\W)'|'(\W)/g, '$1"$2');
            this.sightingLocations = JSON.parse(locationsJsonString);

            // Visualize overall data
            this.visualizeOverallTime();

            for(let i = 0; i < this.sightingsOverTime.length; i++){
                this.numberOfSightings += this.sightingsOverTime[i].sightings.observation_count;
                if(this.sightingsOverTime[i].sightings.observation_count > this.mostSeenBird){
                    this.mostSeenBird = this.sightingsOverTime[i].sightings.common_name;
                }
            }

            // Get total hours bird watched
            axios.get(total_hours_url)
            .then(response => {
                this.totalHoursBirdWatched = response.data.total_hours;
            })
        },
        // Function to select a species and display its graph and mini-map
        selectSpecies(speciesName) {
            if (this.selectedSpecies == speciesName){
                this.selectedSpecies = '';
            }
            else{
                this.selectedSpecies = speciesName;
                this.$nextTick(() => {
                    // Filter the sightings for the selected species
                    const sightingsOfSelectedSpecies = this.sightingLocations
                        .filter(sighting => sighting.sightings.common_name === this.selectedSpecies);
                    
                    // If there are no sightings of the selected species, return
                    
                    // Set the map's view to the location of the first sighting
                    this.visualizeTime();
                    this.visualizeHeatmap();
                    this.map.setView([sightingsOfSelectedSpecies[0].checklists.lat, sightingsOfSelectedSpecies[0].checklists.lng], 13)
                });
            }
        },
        // Function to visualize the overall sightings over time
        visualizeOverallTime() {
            const timeVisualization = document.getElementById('overall-time-visualization');
            if (!timeVisualization) {
                console.error("Element with ID 'overall-time-visualization' not found");
                return;
            }
            timeVisualization.innerHTML = ''; // Clear previous content

            const data = this.overallSightings;

            // Log data to ensure it's correctly transformed
            console.log("Overall Sightings Data:", data);

            // Set the dimensions and margins of the graph
            const margin = { top: 10, right: 30, bottom: 40, left: 60 },
                width = 800 - margin.left - margin.right,
                height = 400 - margin.top - margin.bottom;

            // Append the svg object to the div called 'overall-time-visualization'
            const svg = d3.select("#overall-time-visualization")
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
            // Add x-axis label
            svg.append("text")
            .attr("transform", `translate(${width / 2},${height + margin.top + 30})`)
            .style("text-anchor", "middle")
            .text("Date");

            // Add Y axis
            const y = d3.scaleLinear()
                .domain([0, d3.max(data, d => d.count)])
                .range([height, 0]);
            svg.append("g")
                .call(d3.axisLeft(y));
            
            // Add y-axis label
            svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - margin.left)
            .attr("x",0 - (height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("Number of bird sightings");

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
                .selectAll("circle")
                .data(data)
                .enter()
                .append("circle")
                .attr("cx", d => x(d.date))
                .attr("cy", d => y(d.count))
                .attr("r", 3)
                .attr("fill", "#69b3a2");
        },
        // Function to visualize the sightings of a species over time
        visualizeTime() {
            const timeVisualization = document.getElementById('time-visualization');
            if (!timeVisualization) {
                console.error("Element with ID 'time-visualization' not found");
                return;
            }
            timeVisualization.innerHTML = ''; // Clear previous content

            const data = this.speciesSightings.map(sighting => ({
                date: new Date(sighting.checklists.observation_date),
                count: sighting.sightings.observation_count,
            }));

            // Log data to ensure it's correctly transformed
            console.log("Species Sightings Data:", data);

            // Set the dimensions and margins of the graph
            const margin = { top: 10, right: 30, bottom: 40, left: 60 },
                width = 800 - margin.left - margin.right,
                height = 400 - margin.top - margin.bottom;

            // Append the svg object to the div called 'time-visualization'
            const svg = d3.select("#time-visualization")
                .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);
            // Add Y axis
            const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.count)])
            .range([height, 0]);
            svg.append("g")
            .call(d3.axisLeft(y));
            svg.append("g")
            .call(d3.axisLeft(y));

            // Add y-axis label
            svg.append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", 0 - margin.left)
                .attr("x",0 - (height / 2))
                .attr("dy", "1em")
                .style("text-anchor", "middle")
                .text("Number of bird sightings");

            // Create an array of dates for the x-axis
            const dates = data.map(d => d.date);

            // Add X axis
            const x = d3.scaleBand()
            .domain(dates)
            .range([0, width])
            .padding(0.2); // this adds some space between bars
            svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%Y-%m-%d"))); // format the date

            // Add x-axis label
            svg.append("text")
            .attr("transform", `translate(${width / 2},${height + margin.top + 30})`)
            .style("text-anchor", "middle")
            .text("Date Seen");

            // Calculate bar width
            const maxBarWidth = 30; // Set your desired maximum bar width here
            const barWidth = Math.min(x.bandwidth(), maxBarWidth); // get the minimum of the bandwidth and the maximum bar width

            //Add the bars
            svg.selectAll("rect")
            .data(data)
            .enter()
            .append("rect")
            .attr("x", d => x(d.date) + (x.bandwidth() - barWidth) / 2) // center the bars within their bands
            .attr("y", d => y(d.count))
            .attr("width", barWidth)
            .attr("height", d => height - y(d.count))
            .attr("fill", "rgba(70, 130, 180, 0.5)"); // use rgba color format to specify opacity
            
        },
        // Function to visualize the heatmap of sightings of a species
        visualizeHeatmap() {
            const mapElement = document.getElementById('map');
            if (!mapElement) {
                console.error("Element with ID 'map' not found");
                return;
            }

            if (this.map) {
                this.map.remove(); // Remove the existing map instance
            }

            // Create a map centered at a default location
            this.map = L.map('map').setView([37.7749, -122.4194], 10);



            // Add a tile layer
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 19
            }).addTo(this.map);

            // Filter the sightings for the selected species
            const heatData = this.sightingLocations
                .filter(sighting => sighting.sightings.common_name === this.selectedSpecies)
                .map(sighting => {
                    if (sighting.checklists.lat !== undefined && sighting.checklists.lng !== undefined) {
                        return [
                            sighting.checklists.lat,
                            sighting.checklists.lng,
                            sighting.sightings.observation_count
                        ];
                    }
                    return null;
                }).filter(data => data !== null);

            // Log heatmap data to ensure it's correctly transformed
            console.log("Heatmap Data:", heatData);

            // Add a heatmap layer
            this.heatLayer = L.heatLayer(heatData, { radius: 25, blur: 15, maxZoom: 17 }).addTo(this.map);
        }
    },
    mounted() {
        this.loadData();
    }
};

app.vue = Vue.createApp(app.data).mount("#app");
