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
    layers: [L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png')],
    center: [48.49, 1.395],
    zoom: 16
  });

  // Group of markers.
  var markers = {};

  // Load previously created records.
  store.list()
    .then(function(results) {
      // Add each marker to map.
      results.data.map(addMarker);
    })
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

  function addMarker(record) {
    // Create new marker.
    var marker = L.marker(record.latlng, {draggable: true})
                  .addTo(map);
    // Store reference by record id.
    markers[record.id] = marker;

    // Listen to events on marker.
    marker.on('dblclick', function () {
      store.delete(record.id)
        .then(removeMarker.bind(undefined, record))
        .then(syncServer);
    });
    marker.on('dragend', function () {
      var newlatlng = {latlng: marker.getLatLng()};
      store.get(record.id)
        .then(function (result) {
          var newrecord = Object.assign(result.data, newlatlng);
          return store.update(newrecord);
        })
        .then(syncServer);
    });
  }

  function updateMarker(record) {
    markers[record.id].setLatLng(record.latlng);
  }

  function removeMarker(record) {
    map.removeLayer(markers[record.id]);
    delete markers[record.id];
  }

  function syncServer() {
    var options = {strategy: Kinto.syncStrategy.CLIENT_WINS};
    store.sync(options)
      .then(function (result) {
        if (result.ok) {
          // Add markers for newly created records.
          result.created.map(addMarker);
          // Move updated markers.
          result.updated.map(updateMarker);
          // Remove markers of deleted records.
          result.deleted.map(removeMarker);
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
