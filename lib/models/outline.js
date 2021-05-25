// origin: [0,0,0] local space
function initOutlineBuffer(gl, xdim, ydim, zdim, xspacing, yspacing, zspacing) {
  const dims = [xdim, ydim, zdim];
  const spacings = [xspacing, yspacing, zspacing];
  // get number of vertices in each dimension
  const vtxCounts = dims.map((dim, i) => Math.floor(dim / spacings[i]));
  const maxCount = Math.max(...vtxCounts);

  // normalize each dimension length to 0 to 1
  const dimLength = vtxCounts.map(e => e / maxCount);

  let vertices = [0, 0, 0,
                  dimLength[0], 0, 0,
                  0, dimLength[1], 0,
                  dimLength[0], dimLength[1], 0,
                  0, 0, dimLength[2],
                  dimLength[0], 0, dimLength[2],
                  0, dimLength[1], dimLength[2],
                  dimLength[0], dimLength[1], dimLength[2]];

  // rescale each dimension length to -0.5 to 0.5
  vertices = vertices.map(e => e - 0.5)

  console.log(vertices);

  let outlineVtxBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, outlineVtxBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  outlineVtxBuffer.itemSize = 3;
  outlineVtxBuffer.numItems = 8;

  let indices = [0, 2, 1, 3, 4, 6, 5, 7,
                  0, 1, 2, 3, 4, 5, 6, 7,
                  0, 4, 1, 5, 2, 6, 3, 7];
  let outlineEleBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, outlineEleBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
  outlineEleBuffer.itemSize = 1;
  outlineEleBuffer.numItems = 24;

  return {
    vtxBuffer: outlineVtxBuffer,
    eleBuffer: outlineEleBuffer,
  };
}

function drawOutline(gl, shaderInfo, buffer) {
  const { vtxBuffer, eleBuffer } = buffer;

  gl.bindBuffer(gl.ARRAY_BUFFER, vtxBuffer);
  gl.vertexAttribPointer(shaderInfo.attribLocations.vertexPosition,
    vtxBuffer.itemSize, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, eleBuffer);
  gl.drawElements(gl.LINES, eleBuffer.numItems, gl.UNSIGNED_SHORT, 0);
}

class Outline extends Render {
  constructor(gl, shaderInfo, xdim, ydim, zdim, xspacing, yspacing, zspacing) {
    super(gl, shaderInfo, xdim, ydim, zdim, xspacing, yspacing, zspacing);
    this.buffer = initOutlineBuffer(gl, xdim, ydim, zdim, xspacing, yspacing, zspacing);
  }

  draw(pMatrix, mvMatrix) {
    this.setUniform(pMatrix, mvMatrix);
    drawOutline(this.gl, this.shaderInfo, this.buffer);
  }
}