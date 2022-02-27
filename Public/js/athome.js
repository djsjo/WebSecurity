let lights = {
  'kitchen_lights_stove': '/kitchen/lights/stove',
  'kitchen_lights_ceiling': '/kitchen/lights/ceiling',
  'livingroom_lights_sofa': '/livingroom/lights/sofa',
  'livingroom_lights_ceiling': '/livingroom/lights/ceiling',
  'bedroom_lights_bed': '/bedroom/lights/bed',
  'bedroom_lights_ceiling': '/bedroom/lights/ceiling'
}

let temps = {
  'kitchen_temperature': '/kitchen/temperature',
  'livingroom_temperature': '/livingroom/temperature',
  'bedroom_temperature': '/bedroom/temperature'
}


function refresh() {

  for (let id in lights) {
    let path = '/lab2/exercise1' + lights[id];
    $.getJSON(path, data => {
      $('#' + id).attr('class', data ? 'btn btn-warning btn-sm' : 'btn btn-secondary btn-sm');
    })
  }
  ;

  for (let id in temps) {
      let path = '/lab2/exercise1' + temps[id];
      $.getJSON(path, data => {
          $('#' + id).text(data + 'C');
      } )
  };
}

setInterval(refresh, 5000);

function clickLight(id) {
  let path = '/lab2/exercise1' + lights[id];
  $.post(path, res => {
    $('#' + id).attr('class', res ? 'btn btn-warning btn-sm' : 'btn btn-secondary btn-sm');
  });

}
