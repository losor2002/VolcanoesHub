const map = L.map('map').setView([40.774018, 14.789839], 8);

L.control.scale().addTo(map);
const layersControl = L.control.layers().addTo(map);

const gmapBaseLayer = L.tileLayer('http://mt0.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.google.com/intl/it_it/help/terms_maps/">Google</a>'
}).addTo(map);

const osmBaseLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
});

layersControl.addBaseLayer(osmBaseLayer, "OpenStreetMap");
layersControl.addBaseLayer(gmapBaseLayer, "Satellite");

let volcanoesLayer;
const getJsonVolcanoes = addVolcanoesToMap([], true);

const changeLayerButton = $('#changeLayer').click(loadHeruptions).html('Load Heruptions');
const baseHeruptionsUrl = 'geodata/heruptions/';
let heruptionsLayer;

const heatmapGradient = $('#heatmap-gradient').hide();
const showYear = $('#showYear').hide();
const changeYearRange = $('#changeYear').hide().on('input', function () {
    map.removeLayer(heruptionsLayer);
    addHeruptionsToMap(baseHeruptionsUrl + 'heruptions' + changeYearRange.val() + '.png');

    showYear.html(changeYearRange.val());
});

const searchVolcanoText = $('#searchVolcanoText').keypress(function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        searchVolcanoButton.click();
    }
});
const searchVolcanoButton = $('#searchVolcanoButton').click(function () {
    const searchVolcanoVal = searchVolcanoText.val().toLowerCase().trim();
    if (searchVolcanoVal.length === 0) {
        return;
    }
    for (const layer of volcanoesLayer.getLayers()) {
        if (layer.feature.properties.Volcano_Name.toLowerCase().includes(searchVolcanoVal)) {
            map.setView(layer.getLatLng(), 8);
            layer.openPopup();
            break;
        }
    }
});

const volcanoesTypesContainer = $('#volcanoesTypesContainer');
let volcanoesTypesCheckboxes;
getJsonVolcanoes.done(function () {
    const volcanoesTypes = [];
    volcanoesLayer.eachLayer((layer) => {
        volcanoesTypes.push(layer.feature.properties.Primary_Volcano_Type);
    });
    volcanoesTypes.filter((value, index, array) => {
        return array.indexOf(value) === index;
    }).sort().forEach((type, i) => {
        volcanoesTypesContainer.append(`<div class="col-6">
<div class="form-check form-switch">
<input type="checkbox" class="form-check-input" role="switch" name="volcanoesTypes" id="volcanoType${i}" value="${type}" checked>
<label class="form-check-label" for="volcanoType${i}">${type}</label>
</div>
</div>`);
    });
    volcanoesTypesCheckboxes = $('input[name="volcanoesTypes"]').click(function () {
        map.removeLayer(volcanoesLayer);

        const types = volcanoesTypesCheckboxes.filter(':checked').map(function () {
            return $(this).val();
        }).get();

        addVolcanoesToMap(types);

        if (positionMarker != null) {
            locate(false);
        }

        if (volcanoesTypesCheckboxes.length === types.length) {
            allVolcanoTypes.prop("checked", true);
        } else {
            allVolcanoTypes.prop("checked", false);
        }
    });
});
const allVolcanoTypes = $("#allVolcanoTypes").click(function () {
    map.removeLayer(volcanoesLayer);

    if ($(this).is(":checked")) {
        volcanoesTypesCheckboxes.prop("checked", true);
        addVolcanoesToMap([], true);
    } else {
        volcanoesTypesCheckboxes.prop("checked", false);
        addVolcanoesToMap([]);
    }

    if (positionMarker != null) {
        locate(false);
    }
});

let positionMarker;
let positionCircle;
const locateInput = $('#locate').click(() => {
    locate(true);
}).parent().parent();
$('#locateDistance').keypress(function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        $('#locate').click();
    }
});
const removeLocation = $('#removeLocation').hide().click(function () {
    map.removeLayer(positionMarker);
    positionMarker = null;
    map.removeLayer(positionCircle);
    positionCircle = null;
    volcanoesLayer.eachLayer(function (layer) {
        layer.setStyle({fillColor: 'red'});
    });
    removeLocation.hide();
});

function loadHeruptions() {
    map.removeLayer(volcanoesLayer);
    if (positionMarker != null) {
        map.removeLayer(positionMarker);
    }
    if (positionCircle != null) {
        map.removeLayer(positionCircle);
    }
    addHeruptionsToMap(baseHeruptionsUrl + 'heruptions2000.png');
    searchVolcanoText.hide();
    searchVolcanoButton.hide();
    volcanoesTypesContainer.hide();
    locateInput.hide();
    removeLocation.hide();

    changeLayerButton.off('click').click(loadVolcanoes).html('Load Volcanoes');
    showYear.show().html(2000);
    changeYearRange.show().val(2000);
    heatmapGradient.show();
}

function loadVolcanoes() {
    map.removeLayer(heruptionsLayer);
    if (positionMarker != null) {
        positionMarker.addTo(map);
    }
    if (positionCircle != null) {
        positionCircle.addTo(map);
    }
    volcanoesLayer.addTo(map);
    searchVolcanoText.show();
    searchVolcanoButton.show();
    volcanoesTypesContainer.show();
    locateInput.show();
    if (positionMarker != null) {
        removeLocation.show();
    }

    changeLayerButton.off('click').click(loadHeruptions).html('Load Heruptions');
    showYear.hide();
    changeYearRange.hide();
    heatmapGradient.hide();
}

function printProperty(propertyName, property) {
    return property != null ? '<b>' + propertyName + ': </b>' + property + '<br>' : '';
}

function addHeruptionsToMap(heruptionsUrl) {
    const latLngBounds = L.latLngBounds([[90, 180], [-90, -180]]);

    heruptionsLayer = L.imageOverlay(heruptionsUrl, latLngBounds, {
        opacity: 0.6,
        alt: 'Heruptions layer not found'
    }).addTo(map);
}

function addVolcanoesToMap(types, all) {
    return $.getJSON('geodata/volcanoes/volcanoes.geojson')
        .done(function (volcanoes) {
            volcanoesLayer = L.geoJSON(volcanoes, {
                onEachFeature: function (feature, layer) {
                    layer.bindPopup('<b>' + feature.properties.Volcano_Name + '</b><br><br>'
                        + printProperty('Type', feature.properties.Primary_Volcano_Type)
                        + printProperty('Last Eruption Year', feature.properties.Last_Eruption_Year)
                        + printProperty('Country', feature.properties.Country)
                        + printProperty('Elevation', feature.properties.Elevation)
                        + printProperty('Tectonic Setting', feature.properties.Tectonic_Setting)
                        + printProperty('Geological Summary', feature.properties.Geological_Summary)
                        + (feature.properties.Primary_Photo_Link != null
                            ? '<br><img src="' + feature.properties.Primary_Photo_Link + '" alt="volcano photo" class="img-fluid">'
                            : ''));
                },
                filter: function (feature) {
                    if (all === true) {
                        return true;
                    }

                    return types.includes(feature.properties.Primary_Volcano_Type);
                },
                pointToLayer: function (feature, latlng) {
                    return L.circleMarker(latlng, {
                        radius: 8,
                        fillColor: "#ff0000",
                        color: "#000000",
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 0.8
                    });
                }
            }).addTo(map);
        });
}

function locate(setView) {
    map.once("locationfound", function (evt) {
        const latlng = evt.latlng;
        const distance = $('#locateDistance').val() * 1000;

        if (positionMarker != null) {
            map.removeLayer(positionMarker);
        }
        positionMarker = L.marker(latlng).addTo(map).bindPopup(`Your position is within ${evt.accuracy} meters`);

        if (positionCircle != null) {
            map.removeLayer(positionCircle);
        }
        positionCircle = L.circle(latlng, {
            color: "blue",
            radius: evt.accuracy
        }).addTo(map).bringToBack();

        volcanoesLayer.eachLayer(function (layer) {
            if (latlng.distanceTo(L.GeoJSON.coordsToLatLng(layer.feature.geometry.coordinates)) <= distance) {
                layer.setStyle({fillColor: 'yellow'});
            } else {
                layer.setStyle({fillColor: 'red'});
            }
        });

        if (setView) {
            const circle = L.circle(latlng, {
                radius: distance
            }).addTo(map);
            map.fitBounds(circle.getBounds());
            map.removeLayer(circle);
        }

        $('#locate').html('Locate');
        removeLocation.show();
    }).locate();
    $('#locate').html('<div class="spinner-border spinner-border-sm"></div>');
}