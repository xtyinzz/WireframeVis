// Grid: Wireframe with interior=True, every grid rendered.
// Wireframe: wires on the surfaces
// origin: [0,0,0] local space
function initWireframeBuffer(gl, xdim, ydim, zdim, xspacing, yspacing, zspacing, interior) {
  console.log('start wireframe buffer init');

  const dims = [xdim, ydim, zdim];
  const spacings = [xspacing, yspacing, zspacing];
  // get number of vertices in each dimension
  const vtxCounts = dims.map((dim, i) => Math.floor(dim / spacings[i]));
  const maxCount = Math.max(...vtxCounts);

  // normalize each dimension length to 0 to 1
  const dimLength = vtxCounts.map(e => e / maxCount);

  // get the length of each grid edge, where there are (# of vtx - 1) each dim
  const [xStepLen, yStepLen, zStepLen] = dimLength.map((e, i) => e / (vtxCounts[i] - 1));

  let vertices = [];
  let indices = [];

  if (interior) {
    // note the memory is O(XYZ), and the # of vtx scales quickly to over 2^16,
    // which is too big for Uint16 to represent
    // Can be optimized by included vtx only on surfaces, not interior volume
    const numVtxTotal = vtxCounts[0] * vtxCounts[1] * vtxCounts[2];
    vertices = new Array(3 * numVtxTotal);
    // init vtxBuffer
    let vtxIdx = 0;
    for (let k = 0; k < vtxCounts[2]; k++) {
      for (let j = 0; j < vtxCounts[1]; j++) {
        for (let i = 0; i < vtxCounts[0]; i++) {
          //console.log(`i: ${i} j: ${j} k: ${k}`);
          vertices[vtxIdx] = i * xStepLen - 0.5;
          vertices[vtxIdx + 1] = j * yStepLen - 0.5;
          vertices[vtxIdx + 2] = k * zStepLen - 0.5;
          vtxIdx += 3;
        }
      }
    }

    // init indices
    // get how many idx increment each point has on each dim
    const [xStep, yStep, zStep] = [1, vtxCounts[0], vtxCounts[0] * vtxCounts[1]];

    let front_back_ind = getGridIndicesOneDirection(vtxCounts, 2, 0, 1, zStep, xStep, yStep);
    let left_right_ind = getGridIndicesOneDirection(vtxCounts, 2, 1, 0, zStep, yStep, xStep);
    let bot_top_ind = getGridIndicesOneDirection(vtxCounts, 1, 0, 2, yStep, xStep, zStep);
    indices = [...front_back_ind, ...left_right_ind, ...bot_top_ind];
  } else {
    // init vertices
    // # of vtx in top/bot: full vtx - internal vtx
    const numTopBotVtx =
      vtxCounts[0]*vtxCounts[1] - (vtxCounts[0]-2)*(vtxCounts[1]-2);

    let botFaceVertices = getFaceVtxNoInterior(
      vtxCounts[0],
      vtxCounts[1],
      xStepLen,
      yStepLen,
      0
    );
    let topFaceVertices = getFaceVtxNoInterior(
      vtxCounts[0],
      vtxCounts[1],
      xStepLen,
      yStepLen,
      dimLength[2]
    );
    let midFaceVertices = [];
    for (let k = 1; k < vtxCounts[2]-1; k++) {
      midFaceVertices.push(...getSquareVtx(dimLength[0], dimLength[1], k*zStepLen));
    }
    vertices = [...botFaceVertices, ...midFaceVertices, ...topFaceVertices];
    for (let i = 0; i < 20; i++) {
      console.log(`vtx ${i+1} ${vertices.slice(i*3, i*3+3)}`);
    }
    // init indices
    let internalWireframeIdx = getWireframIndices(vtxCounts);
    let outlineIdx = getOutlineIndices(vtxCounts);
    indices = [...internalWireframeIdx, ...outlineIdx];
    //console.log(indices);
  }

  let wireframeVtxBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, wireframeVtxBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  wireframeVtxBuffer.itemSize = 3;
  wireframeVtxBuffer.numItems = vtxCounts[0] * vtxCounts[1] * vtxCounts[2];

  let wireframeEleBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, wireframeEleBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
  wireframeEleBuffer.itemSize = 1;
  wireframeEleBuffer.numItems = indices.length;

  return {
    vtxBuffer: wireframeVtxBuffer,
    eleBuffer: wireframeEleBuffer,
  };
}

function drawWireframe(gl, shaderInfo, buffer) {
  const { vtxBuffer, eleBuffer } = buffer;

  gl.bindBuffer(gl.ARRAY_BUFFER, vtxBuffer);
  gl.vertexAttribPointer(shaderInfo.attribLocations.vertexPosition,
    vtxBuffer.itemSize, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, eleBuffer);
  gl.drawElements(gl.LINES, eleBuffer.numItems, gl.UNSIGNED_SHORT, 0);
}


function getWireframIndices(vtxCounts) {
  const numTopBotVtx =
  vtxCounts[0]*vtxCounts[1] - (vtxCounts[0]-2)*(vtxCounts[1]-2);

  // init indices
  const xInternalStep = 1;
  const yInternalStep = 2;
  const zInternalStep = 4;
  // # of idx inclement for a line crossing a dimension (i.e. the changing dimension)
  // e.g. zEndStep: # of inclement when the ending vtx crosses z dimension (z changes)
  const zEndStep = vtxCounts[0] * 2 + 2 * (vtxCounts[1] - 2) + 4*(vtxCounts[2]-2);
  const xEndStep = 1;
  // when the vtx crossing Y is on Top/Bot face or Mid. Different cases.
  const yEndStepBotTop = vtxCounts[0] + 2 * (vtxCounts[1] - 2);
  const yEndStepMid = 2;

  // draw vet and hon wire top/bot
  // starting with a base vtx index (left bot vtx) and then build up indices
  let baseIdx1;
  let baseIdx2;

  // top/bot: dim1=X, dim2=Y
  baseIdx1 = 1;
  baseIdx2 = vtxCounts[0];
  let botFaceIndices = getInternalWireIndicesTwoDir(
    vtxCounts[0], vtxCounts[1],
    baseIdx1, baseIdx2,
    xInternalStep, yInternalStep,
    yEndStepBotTop, xEndStep
  );

  baseIdx1 += zEndStep;
  baseIdx2 += zEndStep;
  let topFaceIndices = getInternalWireIndicesTwoDir(
    vtxCounts[0], vtxCounts[1],
    baseIdx1, baseIdx2,
    xInternalStep, yInternalStep,
    yEndStepBotTop, xEndStep
  );

  // draw hon wire side
  // left/right: dim1=Y, dim2=Z
  baseIdx1 = vtxCounts[0];
  baseIdx2 = numTopBotVtx;
  let leftFaceIndices = getInternalWireIndicesTwoDir(
    vtxCounts[1], vtxCounts[2],
    baseIdx1, baseIdx2,
    yInternalStep, zInternalStep,
    zEndStep, yEndStepMid
  );

  baseIdx1 += xEndStep;
  baseIdx2 += xEndStep;
  let rightFaceIndices = getInternalWireIndicesTwoDir(
    vtxCounts[1], vtxCounts[2],
    baseIdx1, baseIdx2,
    yInternalStep, zInternalStep,
    zEndStep, yEndStepMid
  );
  // draw ver wire side
  // front/back: dim1=X, dim2=Z
  baseIdx1 = 1;
  baseIdx2 = numTopBotVtx;
  let frontFaceIndices = getInternalWireIndicesTwoDir(
    vtxCounts[0], vtxCounts[2],
    baseIdx1, baseIdx2,
    xInternalStep, zInternalStep,
    zEndStep, xEndStep
  );
  baseIdx1 += yEndStepBotTop;
  baseIdx2 += yEndStepMid;
  let backFaceIndices = getInternalWireIndicesTwoDir(
    vtxCounts[0], vtxCounts[2],
    baseIdx1, baseIdx2,
    xInternalStep, zInternalStep,
    zEndStep, xEndStep
  );
  return [
    ...topFaceIndices, ...botFaceIndices,
    ...leftFaceIndices, ...rightFaceIndices,
    ...frontFaceIndices, ...backFaceIndices,
  ];
}

// get vtx idx to draw lines in one direction on one face, excluding both ends.
// baseIdx: idx of the first internal vtx on the starting edge dimension
// edgeIdxStep: index increment from starting vtx to ending vtx of a line (internal vtx)
function getInternalWireIndicesOneDir(dimCount, baseIdx, internalStep, endStep) {
  const lineCount = dimCount - 2; // excluding two ends, so there two 2 fewer lines
  let indices = new Array(2*lineCount);
  for (let i = 0; i < lineCount; i++) {
    indices[i*2] = baseIdx + i*internalStep;
    indices[i*2 + 1] = baseIdx + endStep + i*internalStep;
  }
  return indices;
}

// get vtx idx to draw lines in two opposing direction on one face, excluding ends on both dir.
function getInternalWireIndicesTwoDir(
  dimCount1, dimCount2,
  baseIdx1, baseIdx2,
  internalStep1, internalStep2,
  endStep1, endStep2
) {
  let lineIndicesDim1 = getInternalWireIndicesOneDir(dimCount1, baseIdx1, internalStep1, endStep1);
  let lineIndicesDim2 = getInternalWireIndicesOneDir(dimCount2, baseIdx2, internalStep2, endStep2);

  const twoDIndices = [...lineIndicesDim1, ...lineIndicesDim2];
  console.log(twoDIndices);
  return twoDIndices;
}

// get vtx idx to draw the volume outline, with vtx indices setup of Wireframe (NO interior).
function getOutlineIndices(vtxCounts) {
  const zEndStep = vtxCounts[0] * 2 + 2 * (vtxCounts[1] - 2) + 4*(vtxCounts[2]-2);
  // when the vtx crossing Y is on Top/Bot face or Mid. Different cases.
  const yEndStepBotTop = vtxCounts[0] + 2 * (vtxCounts[1] - 2);
  const botVtxIdx = [0, vtxCounts[0]-1, vtxCounts[0]-1 + yEndStepBotTop, yEndStepBotTop];
  let botSquareIdx = new Array(8);
  let topSquareIdx = new Array(8);
  let pillarsIdx = new Array(8);
  for (let i = 0; i < botVtxIdx.length; i++) {
    const endVtxIdx = (i+1) % botVtxIdx.length;
    const lineArrayIdx = i*2;
    botSquareIdx[lineArrayIdx] = botVtxIdx[i];
    botSquareIdx[lineArrayIdx+1] = botVtxIdx[endVtxIdx];
    topSquareIdx[lineArrayIdx] = botVtxIdx[i] + zEndStep;
    topSquareIdx[lineArrayIdx+1] = botVtxIdx[endVtxIdx] + zEndStep;
    pillarsIdx[lineArrayIdx] = botVtxIdx[i];
    pillarsIdx[lineArrayIdx+1] = botVtxIdx[i] + zEndStep;
  }
  const outlineIdx = [...botSquareIdx, ...pillarsIdx, ...topSquareIdx];
  for (let i = 0; i < outlineIdx.length/2; i++) {
    console.log(`vtx ${i+1} ${outlineIdx.slice(i*2, i*2+2)}`);
  }
  return [...botSquareIdx, ...pillarsIdx, ...topSquareIdx];
}

// define the vertex dices to draw all lines along one direction in the grid volume
// direction: (front-back) or (left-right) or (bot-top)
function getGridIndicesOneDirection(vtxCounts, outDimIdx, midDimIdx, inDimIdx, outStep, midStep, inStep) {
  let indices = new Array(2 * vtxCounts[outDimIdx] * vtxCounts[midDimIdx]);
  let indIdx = 0;
  for (let i = 0; i < vtxCounts[outDimIdx]; i++) {
    let outIdx = i * outStep;
    for (let j = 0; j < vtxCounts[midDimIdx]; j++) {
      let startIdx = midStep * j + outIdx;
      indices[indIdx] = startIdx;
      indices[indIdx + 1] = startIdx + inStep * (vtxCounts[inDimIdx] - 1);
      indIdx += 2;
    }
  }
  return indices;
}

// get vtx coords for a face without internal vtx.
function getFaceVtxNoInterior(xCount, yCount, xStepLen, yStepLen, z) {
  let frontLineVtx = getLineVtx(xStepLen, xCount, 0, z);

  let backLineVtx = getLineVtx(xStepLen, xCount, (yCount-1)*yStepLen, z);
  let midLineVtx = [];
  for (let j = 1; j < yCount-1; j++) {
    const xdimLen = xStepLen*(xCount-1);
    midLineVtx.push(...getLineVtx(xdimLen, 2, j*yStepLen, z));
  }
  return [...frontLineVtx, ...midLineVtx, ...backLineVtx];
}

`
Potential improvenment:
  can standardize vertice creation as getLineVtx(xStepLen, numVtx, y, z);
  Then, top/bot face vertices = 3 calls eachs, mid face vertices = 2 calls each
`
// get vtx coords on one honrizontal line
function getLineVtx(xStepLen, xCount, y, z) {
  let vertices = new Array(3*xCount);
  let vtxIdx = 0;
  for (let i = 0; i < xCount; i++) {
    vertices[vtxIdx] = i*xStepLen - 0.5;
    vertices[vtxIdx+1] = y - 0.5;
    vertices[vtxIdx+2] = z - 0.5;
    vtxIdx += 3;
  }
  return vertices;
}

// get 4 vtx coords of a square
// could have implemented by calling getLineVtx
// This one is faster. R.I.P. to code reusability.
function getSquareVtx(xdimLen, ydimLen, z) {
  const vertices = [
    0, 0, z,
    xdimLen, 0, z,
    0, ydimLen, z,
    xdimLen, ydimLen, z,
  ];

  return vertices.map(e => e-0.5);
}

class Wireframe extends Render {
  constructor(gl, shaderInfo, xdim, ydim, zdim, xspacing, yspacing, zspacing) {
    super(gl, shaderInfo, xdim, ydim, zdim, xspacing, yspacing, zspacing);
    this.buffer = initWireframeBuffer(gl, xdim, ydim, zdim, xspacing, yspacing, zspacing, false);
  }

  draw(pMatrix, mvMatrix) {
    this.setUniform(pMatrix, mvMatrix);
    drawWireframe(this.gl, this.shaderInfo, this.buffer);
  }
}

class Grid extends Render {
  constructor(gl, shaderInfo, xdim, ydim, zdim, xspacing, yspacing, zspacing) {
    super(gl, shaderInfo, xdim, ydim, zdim, xspacing, yspacing, zspacing);
    this.buffer = initWireframeBuffer(gl, xdim, ydim, zdim, xspacing, yspacing, zspacing, true);
  }

  draw(pMatrix, mvMatrix) {
    this.setUniform(pMatrix, mvMatrix);
    drawWireframe(this.gl, this.shaderInfo, this.buffer);
  }
}

`
if (interior) {
  idx + 
}
`