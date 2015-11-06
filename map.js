function main() {
  // Mozilla demo server (flushed every day)
  var server = "https://kinto.dev.mozaws.net/v1";
  // Simplest credentials ever.
  var authorization =  "Basic " + btoa("public:notsecret");

  // Kinto client with sync options.
  var kinto = new Kinto({remote: server, headers: {Authorization: authorization}});

  // Local store in IndexedDB.
  var store = kinto.collection("kinto_demo_leaflet");

  // Initialize map centered on my hometown.
  var map = L.map('map', {
    doubleClickZoom: false,
    layers: [L.tileLayer('//{s}.tile.osm.org/{z}/{x}/{y}.png')],
    center: [48.49, 1.395],
    zoom: 16
  });

  // Group of markers.
  var markers = L.layerGroup().addTo(map);

  // Load previously created records.
  loadMarkers()
    .then(syncServer);

  // Create marker on double-click.
  map.on('dblclick', function(event) {
    // Save in local store.
    store.create({latlng: event.latlng})
      .then(function (result) {
        // Add marker to map.
        addMarker(result.data);
      })
      .then(syncServer);
  });

  function loadMarkers() {
    markers.eachLayer(map.removeLayer.bind(map));
    return store.list()
      .then(function(results) {
        // Add each marker to map.
        results.data.map(addMarker);
      });
  }

  function addMarker(record) {
    var layer = L.marker(record.latlng);
    markers.addLayer(layer);
    layer.on('click', deleteMarker.bind(undefined, record.id));
  }

  function deleteMarker(id, event) {
    store.delete(id)
      .then(function () {
        // Remove clicked layer from map.
        map.removeLayer(event.target);
      })
      .then(syncServer);
  }

  function syncServer() {
    store.sync()
      .then(function (result) {
        if (result.ok) {
          loadMarkers();
        }
      });
  }
}

window.addEventListener("DOMContentLoaded", main);
