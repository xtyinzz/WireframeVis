// import { Shader } from "./shaders/shader.js";
// import { Outline } from "./models/outline.js";
// import { Wireframe } from "./models/wireframe.js";
// import { Events } from "./event.js";
// import { mat4 } from "./gl-matrix/esm/index.js";
// document.write('<script src="lib/gl-matrix-min.js"></script>');
// document.write('<script type="application/javascript" src="lib/shaders/shader.js"></script>');
// document.write('<script type="application/javascript" src="lib/models/common.js"></script>');
// document.write('<script type="application/javascript" src="lib/models/outline.js"></script>');
// document.write('<script type="application/javascript" src="lib/models/wireframe.js"></script>');
// document.write('<script type="application/javascript" src="lib/event.js"></script>');


function initMatrices(trans, eyePos, coi, up, fov, aspect, zNear, zFar) {
  // Set the drawing position to the "identity" point, which is
  // the center of the scene.
  let modelMatrix = mat4.create();

  // Now move the drawing position a bit to where we want to
  // start drawing the square.
  mat4.translate(
    modelMatrix, // destination matrix
    modelMatrix, // matrix to translate
    trans
  ); // amount to translate

  // get view matrix
  let viewMatrix = mat4.create();
  mat4.lookAt(viewMatrix, eyePos, coi, up);

  // get mvMatrix
  let modelViewMatrix = mat4.create();
  mat4.mul(modelViewMatrix, modelMatrix, viewMatrix);

  let projectionMatrix = mat4.create();
  // note: glmatrix.js always has the first argument
  // as the destination to receive the result.
  mat4.perspective(projectionMatrix, fov, aspect, zNear, zFar);

  return {
    mv: modelViewMatrix,
    p: projectionMatrix,
  };
}

function initScene(gl, displayObject, mvMatrix, pMatrix) {
  gl.clearColor(1.0, 1.0, 1.0, 1.0); // Clear background to white, fully opaque
  gl.clearDepth(1.0); // Clear everything
  gl.enable(gl.DEPTH_TEST); // Enable depth testing
  gl.depthFunc(gl.LEQUAL); // Near things obscure far things

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear canvas

  // draw the volume display method
  displayObject.draw(mvMatrix, pMatrix);
}

function main() {
  const canvas = document.querySelector("#volume-canvas");
  // setup GL context
  const gl = canvas.getContext("webgl");
  gl.enable(gl.DEPTH_TEST);

  // Only continue if WebGL is available and working
  if (gl === null) {
    alert(
      "Unable to initialize WebGL. Your browser or machine may not support it."
    );
    return;
  }

  // setup shader
  const shaderProgram = Shader.initShaderProgram(
    gl,
    Shader.vsScript,
    Shader.fsScript
  );
  const shaderInfo = {
    program: shaderProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(
        shaderProgram,
        "uProjectionMatrix"
      ),
      modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
    },
  };
  gl.useProgram(shaderInfo.program); // TODO: read doc
  gl.enableVertexAttribArray(shaderInfo.attribLocations.vertexPosition);

  // setup transformation matrices: mv and p
  const initTrans = [0, 0, -4];

  const eyePos = [0, 0, 0];
  const coi = [0, 0, -5];
  const up = [0, 5, 0];

  const fieldOfView = (45 * Math.PI) / 180; // in radians
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const zNear = 0.1;
  const zFar = 100.0;

  const transMats = initMatrices(
    initTrans,
    eyePos,
    coi,
    up,
    fieldOfView,
    aspect,
    zNear,
    zFar
  );

  // initialize canvas attributes for event use
  gl.canvas.volumeParam = {};
  gl.canvas.mats = { p: transMats.p, mv: transMats.mv };
  gl.canvas.method = 'outline';

  // initialize volume properties and event handler
  addPropertyChangeHandler(gl ,shaderInfo);
  addMethodChangeHandler(gl, shaderInfo);

  // initialize display geometry with buffer
  let renderObject = getRenderer(gl.canvas.method, gl, shaderInfo, gl.canvas.volumeParam);

  // draw scenes
  // outline: a cube with only outer edges
  // wireframe: a cube with wires outlining  each grid on surface
  // ...
  initScene(gl, renderObject, transMats.mv, transMats.p);
  gl.canvas.scene = renderObject;

  // register events for interactivity
  gl.canvas.addEventListener("mousedown", Events.mouseDown);
  gl.canvas.addEventListener("mousemove", Events.mouseMove);
  gl.canvas.addEventListener("mouseup", Events.mouseUp);
  gl.canvas.addEventListener("wheel", Events.wheel);
  // set the scene/geomotry and transformation matrices as element attribute
  // for further event use
}

main();
