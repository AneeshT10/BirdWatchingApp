"use strict";

// This will be the object that will contain the Vue attributes
// and be used to initialize it.
let app = {};


app.data = {    
    data: function() {
        return {
            selectedSpecies: '',
            showPopup: false,
            species_stats: null,
            mostSeenBird: '',
        };
    },
    methods: {
      //Function allows to display the popup with the bird's statistics when 
      //clicking on a bird in the bird list
      selectSpecies: function(species) {
        if (this.showPopup && this.selectedSpecies.common_name == species.common_name ) {
          this.showPopup = !this.showPopup;
          return;
        }
        this.selectedSpecies = species;
        this.showPopup = true;
        // Get event_ids where bird names match
        axios.get(get_sightings_url, {
          params: {
            bird_name: species.common_name
          }
        }).then((response) => {
          let event_ids = response.data.sightings.map(sighting => sighting.sightings.sampling_event_id);
          let data = response.data.sightings.map(sighting => sighting._extra['SUM("sightings"."observation_count")']);

          axios.get(get_checklists_url, {
            params: {
              event_ids: event_ids.join(',')
            }
          }).then((response2) => {

            let labels = response2.data.checklists.map(checklist => checklist.observation_date);
            
            //Create bird graph with sightings over time in the specific region
            this.$nextTick(() => {
              var ctx = document.getElementById('myChart').getContext('2d');
              var myChart = new Chart(ctx, {
                type: 'line',
                data: {
                  labels: labels,
                  datasets: [{
                    label: '# of Sightings',
                    data: data,
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                  }]
                },
                options: {
                  plugins: {
                    zoom: {
                      pan: {
                        enabled: true,
                        mode: 'xy' // Enable panning only in the x direction
                      },
                      zoom: {
                        wheel: {
                          enabled: true,
                        },
                        drag: {
                          enabled: false,
                        },
                        pinch: {
                          enabled: false,
                        },
                        mode: 'x' // Enable zooming only in the x direction
                      }
                    }
                  }
                }
              });
            });
          });
        });
      },
      
    }
};

app.vue = Vue.createApp(app.data).mount("#app");

app.load_data = function () {
  //Fetch species data and calculate the most seen bird
  app.vue.species_stats = species_stats;
  let max_sightings = 0;
  for(let i = 0; i < app.vue.species_stats.length; i++) {
    if (app.vue.species_stats[i].total_sightings > max_sightings){
      max_sightings = app.vue.species_stats[i].total_sightings;
      app.vue.mostSeenBird = app.vue.species_stats[i].common_name;
    }
  }
}

app.load_data();

