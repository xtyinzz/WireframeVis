let lastCanvasX = 0;
let lastCanvasY = 0;
let Z_angle = 0;
let isDraging = false;

function degToRad(degrees) {
  return (degrees * Math.PI) / 180;
}

// mouse events for rotation
function onCanvasMouseDown(event) {
  event.preventDefault();
  lastCanvasX = event.clientX;
  lastCanvasY = event.clientY;
  isDraging = true;
}
function onCanvasMouseMove(event) {
  if (isDraging) {
    const currentX = event.clientX;
    const currentY = event.ClientY;

    const diffX = currentX - lastCanvasX;
    const diffY = currentY - lastCanvasY;

    lastCanvasX = currentX;
    lastCanvasY = currentY;

    // get the canvas element
    const canvas = event.currentTarget;
    mat4.rotate(canvas.mats.mv, canvas.mats.mv, degToRad(diffX / 5), [0, 1, 1]);
    canvas.scene.draw(canvas.mats.mv, canvas.mats.p);
  }
}
function onCanvasMouseUp(event) {
  lastCanvasX = event.clientX;
  lastCanvasY = event.clientY;
  isDraging = false;
}

// mouse wheel event for scaling
function onCanvasWheel(event) {
  event.preventDefault();

  const scaleFactor = event.deltaY > 0 ? [1.1, 1.1, 1.1] : [0.9, 0.9, 0.9];

  const canvas = event.currentTarget;
  mat4.scale(canvas.mats.mv, canvas.mats.mv, scaleFactor);
  canvas.scene.draw(canvas.mats.mv, canvas.mats.p);
}

function onVolumePropertyChange(event) {
  const ele = event.target;

  const canvas = document.getElementById('volume-canvas');
  let volumeParam = canvas.volumeParam;
  volumeParam[ele.id] = +ele.value;
  const transMats = canvas.mats;

  let renderObject = getRenderer();
  
  initScene(gl, renderObject, transMats.mv, transMats.p);

  gl.canvas.scene = wireframe;
  console.log(volumeParam);
}

// init canvas.volumeParam and add volume property on change handler
function addPropertyChangeHandler(gl, shaderInfo) {
  let canvas = document.getElementById('volume-canvas');
  const formIDs = ['xdim', 'ydim', 'zdim', 'xspacing', 'yspacing', 'zspacing'];
  let formElements = formIDs.map(e => document.getElementById(e));
  let volumeParam = canvas.volumeParam;

  formElements.forEach(element => {
    volumeParam[element.id] = +element.value;
  
    element.addEventListener('change', (event) => {
      let canvas = document.getElementById('volume-canvas');
      let volumeParam = canvas.volumeParam;
      let transMats = canvas.mats;
      const renderMethod = canvas.method;

      const ele = event.target;
      volumeParam[ele.id] = +ele.value;
  
      let renderObject = getRenderer(renderMethod, gl, shaderInfo, volumeParam);
      
      initScene(gl, renderObject, transMats.mv, transMats.p);
  
      gl.canvas.scene = renderObject;
    });
  });
}

function addMethodChangeHandler(gl, shaderInfo) {
  let buttonEles = [
    'outline', 'wireframe', 'grid',
  ].map(e => document.getElementById(e));

  buttonEles.forEach(e => e.addEventListener('click', function(event) {
    const methodElement = event.target;

    let canvas = document.getElementById('volume-canvas');
    canvas.method = methodElement.id;
    let volumeParam = canvas.volumeParam;
    let transMats = canvas.mats;

    let renderObject = getRenderer(methodElement.id, gl, shaderInfo, volumeParam);
    
    initScene(gl, renderObject, transMats.mv, transMats.p);
    gl.canvas.scene = renderObject;
  }));
}

Events = {
  mouseDown: onCanvasMouseDown,
  mouseMove: onCanvasMouseMove,
  mouseUp: onCanvasMouseUp,
  wheel: onCanvasWheel,
};