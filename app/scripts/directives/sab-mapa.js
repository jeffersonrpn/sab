(function() {
  'use strict';

  angular.module('sabApp')
    .directive('sabMapa', sabMapa);

    sabMapa.$inject = ['$window'];

    /*jshint latedef: nofunc */
    function sabMapa($window) {
      return {
        template: '',
        restrict: 'E',
        scope: {
          onSelectReservatorio: '&'
        },
        link: function postLink(scope, element) {
          var
            d3 = $window.d3,
            topojson = $window.topojson,
            width = 800,
            height = 400;
          var projection = d3.geo.mercator()
            .scale(1000)
            .translate([width * 1.6, height * 0.05]);
          var path = d3.geo.path()
            .projection(projection);
          var zoom = d3.behavior.zoom()
              .translate([0, 0])
              .scale(1)
              .scaleExtent([1, 8])
              .on("zoom", zoomed);
          var svg = d3.select(element[0])
            .append("svg")
            .attr({
              "version": "1.1",
              "viewBox": "0 0 "+width+" "+height,
              "width": "100%",
              "class": "map-svg"})
            .call(zoom);

          var features = svg.append("g").attr("id", "g-mapa");

          var tooltip = d3.select("body")
            .append("div")
            .attr("class", "map-tooltip");

          var mouseOnEvent = function(d) {
            scope.onSelectReservatorio()(d.id);
            var destaque = d3.select(this);
            destaque.transition().duration(200).style("opacity", 1);
          };

          var mouseOffEvent = function() {
            var destaque = d3.select(this);
            destaque.transition().duration(200).style("opacity", 0.5);
          };

          var scaleCircle = function(d) {
              if (d.properties.capacidade <= 10) {
                return (1);
              } else if ((d.properties.capacidade > 10) && (d.properties.capacidade <= 100)) {
                return (1.5);
              } else if ((d.properties.capacidade > 100) && (d.properties.capacidade <= 250)) {
                return (2);
              } else if ((d.properties.capacidade > 250) && (d.properties.capacidade <= 500)) {
                return (3);
              } else if ((d.properties.capacidade > 500) && (d.properties.capacidade <= 750)) {
                return (4);
              } else if (d.properties.capacidade > 750) {
                return (5);
              }
            };

          function zoomed() {
            features.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
          }

          function mapaBrasil(br){
            var brasil = topojson.feature(br, br.objects.estado_sab);

            features.append("g").attr("id", "g-br")
              .append("path")
              .datum(brasil)
              .attr("class", "svg-br")
              .attr("d", path);            
          }

          function mapaSemiArido(sab){
            var semiarido = topojson.feature(sab, sab.objects.div_estadual);

            features.append("g").attr("id", "g-sab")
              .append("path")
              .datum(semiarido)
              .attr("class", "svg-sab")
              .attr("d", path);     
          }

          function mapaReservatorios(reserv){
            var reservatorio = topojson.feature(reserv, reserv.objects.reservatorios_geojson);

            features.append("g").attr("id", "g-reservatorios")
              .selectAll(".reservatorio")
              .data(reservatorio.features)
              .enter()
              .append("circle")
              .attr('id', function(d) { return d.id; })
              .attr("class", "svg-reservatorio")
              .attr("cx", function(d) {
                  return projection([d.geometry.coordinates[0] , d.geometry.coordinates[1]])[0];})
              .attr("cy", function(d) {
                  return projection([d.geometry.coordinates[0], d.geometry.coordinates[1]])[1];})
              .attr("r", scaleCircle)
              .on("mouseover", mouseOnEvent)
              .on("mouseout", mouseOffEvent);
          }


          d3.queue()
            .defer(d3.json, 'http://localhost:5003/estados/br')
            .defer(d3.json, 'http://localhost:5003/estados/sab')
            .defer(d3.json, 'http://localhost:5003/reservatorios')
            .await(desenhaMapa);

          function desenhaMapa(error, br, sab, reserv) {
            if (error) { return console.error(error); }

            mapaBrasil(br);

            mapaSemiArido(sab);
            
            mapaReservatorios(reserv);
            
          }
        }
      };
    }
})();
