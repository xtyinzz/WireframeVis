const { mat4 } = glMatrix;

function getRenderer(method, gl, shaderInfo, volumeParam) {
  let {xdim, ydim, zdim} = volumeParam;
  let {xspacing, yspacing, zspacing} = volumeParam;

  let renderObject;
  switch (method) {
    case 'outline':
      renderObject = new Outline(
        gl,
        shaderInfo,
        xdim,
        ydim,
        zdim,
        xspacing,
        yspacing,
        zspacing
      );
      break;
    case 'wireframe':
      renderObject = new Wireframe(
        gl,
        shaderInfo,
        xdim,
        ydim,
        zdim,
        xspacing,
        yspacing,
        zspacing
      );
      break;
    case 'grid':
      renderObject = new Grid(
        gl,
        shaderInfo,
        xdim,
        ydim,
        zdim,
        xspacing,
        yspacing,
        zspacing
      );
      break;
    default:
      alert(`Invalid Render Method Selected! (${canvas.method})`);
  }
  return renderObject;
}

class Render {
  constructor(gl, shaderInfo, xdim, ydim, zdim, xspacing, yspacing, zspacing) {
    this.gl = gl;
    this.shaderInfo = shaderInfo;
    this.dims = [xdim, ydim, zdim];
    this.spacings = [xspacing, yspacing, zspacing];
  }

  setUniform(mvMatrix, pMatrix) {
    this.gl.uniformMatrix4fv(
      this.shaderInfo.uniformLocations.modelViewMatrix,
      false,
      mvMatrix
    );
    this.gl.uniformMatrix4fv(
      this.shaderInfo.uniformLocations.projectionMatrix,
      false,
      pMatrix
    );
  }
};
