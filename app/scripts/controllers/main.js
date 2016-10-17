(function() {
  'use strict';

  angular.module('sabApp')
    .controller('MainCtrl', MainCtrl);

  MainCtrl.$inject = ['$scope', 'Reservatorio', 'RESTAPI','olData'];

  /*jshint latedef: nofunc */
  function MainCtrl($scope, Reservatorio, RESTAPI,olData) {
    var vm = this;
    vm.reservatorios = [];
    vm.reservatorioSelecionado = {
      nome: "",
      volumes: []
    };
    vm.selectedTab = 1;
    vm.showInfo = true;
    vm.loadingMap = true;
    vm.loadingInfo = true;

    var larguraTela = $(window).width();

    if( larguraTela <= 1000 ) {
      vm.zoomInicial = 5;
      vm.latitude = -9.4044477;
      vm.longitude = -40.507917;
    } else {
      vm.zoomInicial = 6;
      vm.latitude = -10.240929;
      vm.longitude = -44.231820;
    }


    vm.map = {
      center: {
        lat: vm.latitude,
        lon: vm.longitude,
        zoom: vm.zoomInicial
      },
      markers: [],
      layers: [
        {
          name: 'OpenCycleMap',
          active: false,
          source: {
            type: 'OSM',
            url: 'http://{a-c}.tile.opencyclemap.org/cycle/{z}/{x}/{y}.png',
            attribution: 'All maps &copy; <a href="http://www.opencyclemap.org/">OpenCycleMap</a>'
          }
        },
        {
          name: 'semiarido',
          source: {
            type: 'GeoJSON',
            url: RESTAPI.url+'/estados/sab'
          },
          style: semiaridoStyle()
        },
        {
          name: 'reservatorios',
          source: {
            type: 'GeoJSON',
            url: RESTAPI.url+'/reservatorios'
          },
          style: reservStyle()
        }
      ],
      defaults: {
          events: {
              layers: [ 'mousemove', 'click' ]
          },
          controls: {
              zoom: false,
              rotate: false,
              attribution: false
          },
          interactions: {
              mouseWheelZoom: true
          },
          view: {
              maxZoom: 16,
              minZoom: 4
          }
      }
    };
    vm.reservatoriosGeo = [];
    vm.coresReservatorios = [
      {cor: '#a50026', texto: 'Colapso'},
      {cor: '#d73027', texto: 'Crítico'},
      {cor: '#74add1', texto: 'Normal'},
      {cor: '#4575b4', texto: 'Cheio'},
      {cor: '#313695', texto: 'Em Vertimento'},
      {cor: '#9a999e', texto: 'Sem informação'}
    ];
    vm.setReservatorio = setReservatorio;
    vm.setReservatorioByID = setReservatorioByID;
    vm.isSelectedTab = isSelectedTab;
    vm.setSelectedTab = setSelectedTab;
    vm.toggleInfo = toggleInfo;

    vm.reservatorios = Reservatorio.info.query();

    vm.reservatoriosGeo = Reservatorio.geolocalizacao.query(function() {
      vm.reservatoriosGeo = vm.reservatoriosGeo.features;

      vm.loadingMap = false;
    });

    function setReservatorio(reservatorio, lat, lon, zoom) {
      vm.loadingInfo = true;
      if (!(lat && lon && zoom)) {
        for (var i = 0; i < vm.reservatoriosGeo.length; i++) {
          if (vm.reservatoriosGeo[i].properties.id == reservatorio.id) {
            lat = parseFloat(vm.reservatoriosGeo[i].properties.latitude);
            lon = parseFloat(vm.reservatoriosGeo[i].properties.longitude);
            zoom = 10;
            break;
          }
        }
      }

      vm.map.markers = [{
        lat: lat,
        lon: lon
      }];

      efeitoZoom(lat, lon, zoom);
      vm.reservatorioSelecionado = reservatorio;
      var data = Reservatorio.monitoramento.query({id: reservatorio.id}, function() {
        vm.reservatorioSelecionado.volumes = data.volumes;
        vm.reservatorioSelecionado.volumes_recentes = data.volumes_recentes;

        vm.loadingInfo = false;

      });
    }

    function setReservatorioByID(id, lat, lon, zoom) {
      for (var i = 0; i < vm.reservatorios.length; i++) {
        if (parseInt(vm.reservatorios[i].id) === id) {
          setReservatorio(vm.reservatorios[i], lat, lon, zoom);
          break;
        }
      }
    }

    function isSelectedTab(tab) {
      return vm.selectedTab === tab;
    }

    function setSelectedTab(tab) {
      vm.selectedTab = tab;
    }

    function toggleInfo() {
      vm.showInfo = !vm.showInfo;
    }

    function tamanhoReservatorio(feature, zoom) {
      // Esse 1.8 é para tirar a diferença do zoomInicial com o log(zoom);
      var tamanho = Math.abs(Math.log(feature.get("capacidade")))+(vm.zoomInicial+1.8) - Math.log(zoom);
      if (tamanho < 2){
        tamanho = 2;
      }
      return tamanho;

    }

    function corReservatorio(feature) {
      if(feature.get("volume_percentual") == null){
        return new ol.style.Fill({ color: vm.coresReservatorios[5].cor});
      } else{
        var volume_percentual = parseFloat(feature.get("volume_percentual"));

        if (volume_percentual == 0){
          return new ol.style.Fill({ color: vm.coresReservatorios[0].cor});
        }else if (volume_percentual <= 10){
          return new ol.style.Fill({ color: vm.coresReservatorios[1].cor});
        } else if (volume_percentual < 100){
          return new ol.style.Fill({ color: vm.coresReservatorios[2].cor});
        } else if (volume_percentual == 100){
          return new ol.style.Fill({ color: vm.coresReservatorios[3].cor});
        } else{
          return new ol.style.Fill({ color: vm.coresReservatorios[4].cor});
        }
      }

    }

    function reservStyle() {
      return function(feature, zoom) {
        return [new ol.style.Style({
          image: new ol.style.Circle({
            radius:tamanhoReservatorio(feature, zoom),
            fill: corReservatorio(feature)
          })
        })];
      };
    }

    function semiaridoStyle() {
      return new ol.style.Style({
        fill: new ol.style.Fill({color: "rgba(255, 255, 255, 0.3)"}),
        stroke: new ol.style.Stroke({color: "rgba(230, 126, 34, 1)"})
      });
    }

    $scope.$on('openlayers.layers.reservatorios.click', function(event, feature) {
      $scope.$apply(function(scope) {
          if(feature) {
            vm.setReservatorioByID(feature.get('id'), parseFloat(feature.get('latitude')), parseFloat(feature.get('longitude')), 10);
          }
      });
    });

    function efeitoZoom(lat, lon, zoom) {
      var latMais = 0;
      var lonMais = 0;

      if(larguraTela < 1600 && larguraTela > 1000){
        lonMais = -0.4;
      } else if( larguraTela <= 1000 ) {
        latMais = -0.2;
      }

      var reservatorio = ol.proj.fromLonLat([lon + lonMais,lat + latMais]);
      olData.getMap().then(function(map) {
          var bounce = ol.animation.bounce({
              resolution: 1500,
              duration: 2000
            });
          var pan = ol.animation.pan({
              duration: 2000,
              source: map.getView().getCenter()
            });
          map.beforeRender(bounce);
          map.beforeRender(pan);

        map.getView().setCenter(reservatorio);
        map.getView().setZoom(zoom);
      });
    }

  }
})();
