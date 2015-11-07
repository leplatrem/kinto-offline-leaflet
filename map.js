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
  var markers = {};

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
    return store.list()
      .then(function(results) {
        // Add each marker to map.
        results.data.map(addMarker);
      });
  }

  function addMarker(record) {
    var layer = L.marker(record.latlng)
                 .addTo(map);
    // Store marker reference by record id.
    markers[record.id] = layer;
    layer.on('click', deleteMarker.bind(undefined, record.id));
  }

  function deleteMarker(id) {
    store.delete(id)
      .then(function () {
        // Remove clicked layer from map.
        map.removeLayer(markers[id]);
      })
      .then(syncServer);
  }

  function syncServer() {
    var options = {strategy: Kinto.syncStrategy.CLIENT_WINS};
    store.sync(options)
      .then(function (result) {
        if (result.ok) {
          // Add newly created records.
          result.created.map(addMarker);
          // Remove markers of deleted records.
          result.deleted.map(function (record) {
            map.removeLayer(markers[record.id]);
          });
        }
      })
      .catch(function (err) {
        // Special treatment since the demo server is flushed.
        if (err.message.contains("flushed")) {
          // Mark every local record as «new» and re-upload.
          return store.resetSyncStatus()
            .then(syncServer);
        }
        throw err;
      });
  }
}

window.addEventListener("DOMContentLoaded", main);
