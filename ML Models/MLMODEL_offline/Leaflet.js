let predictedPath = [];
let marker = L.marker([0, 0]).addTo(map);
let predictionInterval;
function updatePredictedPath(path) {
    predictedPath = path;
    if (predictionInterval) clearInterval(predictionInterval);
    let index = 0;
    predictionInterval = setInterval(() => {
        if (index >= predictedPath.length) {
            clearInterval(predictionInterval);
            return;
        }
        let point = predictedPath[index];
        marker.setLatLng([point.latitude, point.longitude]);
        index++;
    }, 1000); 
}
function updateRealLocation(lat, lon) {
    if (predictionInterval) clearInterval(predictionInterval);
    marker.setLatLng([lat, lon]);
}