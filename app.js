let canvas, gl, program;

let numVertices = 0;
let camAngle = 90,
  camRadius = 5,
  camHeight = 0;
let deltaAngle = 2,
  deltaRadius = 0.1,
  deltaHeight = 0.1;
let isPerspective = true;

let vBuffer, cBuffer;

let vertices = [];
let points = [];
let colors = [];
let vertexNormals = [];

let currentMaterial = "mat1";
let shadingMode = "phong";
let currentModel = "./bound-lo-sphere.smf";

let cameraAngle = 0,
  cameraRadius = 0;
cameraHeight = 0.5;

let models = [
  {
    file: "./bound-lo-sphere.smf",
    position: vec3(-1.5, -0.25, 0),
    vBuffer: null,
    nBuffer: null,
    numVertices: 0,
  },
  {
    file: "./bound-lo-sphere.smf",
    position: vec3(0.0, 0, 0),
    vBuffer: null,
    nBuffer: null,
    numVertices: 0,
  },
  {
    file: "./bound-lo-sphere.smf",
    position: vec3(1.5, 0.25, 0),
    vBuffer: null,
    nBuffer: null,
    numVertices: 0,
  },
];

const light = {
  light1: {
    ambient: vec3(0.2, 0.2, 0.2),
    diffuse: vec3(0.6, 0.6, 0.6),
    specular: vec3(1.0, 1.0, 1.0),
  },
};

let pickFramebuffer;
let pickTexture;
let pickDepthBuffer;
let texHeight;
let texWidth;

function loadModel(fname) {
  let vertices = [];
  let points = [];
  let vertexNormals = [];

  let smf_file = loadFileAJAX(fname);
  let lines = smf_file.split("\n");
  let normalSum = [],
    normalCount = [],
    faceIndices = [];

  for (let line = 0; line < lines.length; line++) {
    let strings = lines[line].trim().split(" ");
    switch (strings[0]) {
      case "v":
        vertices.push(
          vec3(
            parseFloat(strings[1]),
            parseFloat(strings[2]),
            parseFloat(strings[3]),
          ),
        );
        normalSum.push(vec3(0, 0, 0));
        normalCount.push(0);
        break;

      case "f":
        let idx = [
          parseInt(strings[1]) - 1,
          parseInt(strings[2]) - 1,
          parseInt(strings[3]) - 1,
        ];

        faceIndices.push(idx);

        let a = vertices[idx[0]];
        let b = vertices[idx[1]];
        let c = vertices[idx[2]];

        let normal = normalize(cross(subtract(b, a), subtract(c, a)));

        for (let i = 0; i < 3; i++) {
          normalSum[idx[i]] = add(normalSum[idx[i]], normal);
          normalCount[idx[i]]++;
        }
    }
  }

  for (let i = 0; i < faceIndices.length; i++) {
    let idx = faceIndices[i];
    for (let j = 0; j < 3; j++) {
      let vertexIndex = idx[j];
      points.push(vertices[vertexIndex]);
      let avgNormal = scale(
        1 / normalCount[vertexIndex],
        normalSum[vertexIndex],
      );
      vertexNormals.push(normalize(avgNormal));
    }
  }

  return { points, vertexNormals, numVertices: points.length };
}

function initModels() {
  for (let i = 0; i < models.length; i++) {
    let m = models[i];
    let data = loadModel(m.file);

    m.vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, m.vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(data.points), gl.STATIC_DRAW);

    m.nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, m.nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(data.vertexNormals), gl.STATIC_DRAW);

    m.numVertices = data.numVertices;

    m.material = {
      ambient: vec3(Math.random(), Math.random(), Math.random()),
      diffuse: vec3(Math.random(), Math.random(), Math.random()),
      specular: vec3(Math.random(), Math.random(), Math.random()),
      shininess: Math.random() * 150 + 10,
    };

    m.pickId = i + 1;
  }

  initPickingFramebuffer();
}

function initPickingFramebuffer() {
  texHeight = canvas.width;
  texWidth = canvas.height;

  pickTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, pickTexture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    texHeight,
    texWidth,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null,
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  pickDepthBuffer = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, pickDepthBuffer);
  gl.renderbufferStorage(
    gl.RENDERBUFFER,
    gl.DEPTH_COMPONENT16,
    texHeight,
    texWidth,
  );

  pickFramebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, pickFramebuffer);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    pickTexture,
    0,
  );
  gl.framebufferRenderbuffer(
    gl.FRAMEBUFFER,
    gl.DEPTH_ATTACHMENT,
    gl.RENDERBUFFER,
    pickDepthBuffer,
  );

  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindRenderbuffer(gl.RENDERBUFFER, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function idToColorVec3(id) {
  const r = (id & 0xff) / 255.0;
  const g = ((id >> 8) & 0xff) / 255.0;
  const b = ((id >> 16) & 0xff) / 255.0;
  return vec3(r, g, b);
}

function colorBytesToId(bytes) {
  return bytes[0] + (bytes[1] << 8) + (bytes[2] << 16);
}

function round(num) {
  return (Math.round(num * 100) / 100).toFixed(2);
}

function userInputs() {
  window.addEventListener("keydown", (event) => {
    let key = event.key;
    switch (key) {
      case "a":
        camAngle -= deltaAngle;
        break;
      case "d":
        camAngle += deltaAngle;
        break;
      case "w":
        camHeight += deltaHeight;
        break;
      case "s":
        camHeight -= deltaHeight;
        break;
      case "q":
        camRadius += deltaRadius;
        break;
      case "e":
        camRadius = Math.max(1, camRadius - deltaRadius);
        break;
      case "r":
        camAngle = 90;
        camRadius = 5;
        camHeight = 0;
        break;
    }
    render();
  });
}

function getCameraLightPos() {
  const theta = (cameraAngle * Math.PI) / 180;
  return vec3(
    cameraRadius * Math.cos(theta),
    cameraHeight,
    cameraRadius * Math.sin(theta),
  );
}

function materialUniforms(material) {
  const l = light["light1"];

  let ambientProduct = mult(l.ambient, material.ambient);
  let diffuseProduct = mult(l.diffuse, material.diffuse);
  let specularProduct = mult(l.specular, material.specular);

  gl.uniform3fv(
    gl.getUniformLocation(program, "ambientProduct"),
    flatten(ambientProduct),
  );
  gl.uniform3fv(
    gl.getUniformLocation(program, "diffuseProduct"),
    flatten(diffuseProduct),
  );
  gl.uniform3fv(
    gl.getUniformLocation(program, "specularProduct"),
    flatten(specularProduct),
  );
  gl.uniform1f(gl.getUniformLocation(program, "shininess"), material.shininess);
  gl.uniform3fv(
    gl.getUniformLocation(program, "lightPos1"),
    flatten(getCameraLightPos()),
  );
}

function shaderSelect() {
  program = initShaders(gl, "./pvshader.glsl", "./pfshader.glsl");
  gl.useProgram(program);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  initModels();
  render();
}

window.onload = function init() {
  canvas = document.getElementById("gl-canvas");
  gl = canvas.getContext("webgl2");
  if (!gl) alert("WebGL 2.0 isn't available");

  shaderSelect();
  userInputs();

  canvas.addEventListener("mousedown", performPick);
};

function getProjectionMatrix() {
  return perspective(50, canvas.width / canvas.height, 0.1, 50);
}

function renderScene(picking = false) {
  if (picking) {
    gl.viewport(0, 0, texHeight, texWidth);
  } else {
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  let thetaRad = (camAngle * Math.PI) / 180;
  let eye = vec3(
    camRadius * Math.cos(thetaRad),
    camHeight,
    camRadius * Math.sin(thetaRad),
  );
  let at = vec3(0, 0, 0);
  let up = vec3(0, 1, 0);
  let view = lookAt(eye, at, up);
  let projection = getProjectionMatrix();

  gl.uniformMatrix4fv(
    gl.getUniformLocation(program, "projectionMatrix"),
    false,
    flatten(projection),
  );
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const uPickingLoc = gl.getUniformLocation(program, "uPicking");
  const uPickColorLoc = gl.getUniformLocation(program, "uPickColor");

  gl.uniform3fv(uPickColorLoc, [0.0, 0.0, 0.0]);

  for (let m of models) {
    gl.bindBuffer(gl.ARRAY_BUFFER, m.vBuffer);
    let aPosition = gl.getAttribLocation(program, "aPosition");
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, m.nBuffer);
    let aNormal = gl.getAttribLocation(program, "aNormal");
    gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aNormal);

    if (picking) {
      gl.uniform1i(uPickingLoc, 1);
      gl.uniform3fv(uPickColorLoc, flatten(idToColorVec3(m.pickId)));
    } else {
      gl.uniform1i(uPickingLoc, 0);
      materialUniforms(m.material);
    }

    let model = translate(m.position[0], m.position[1], m.position[2]);
    let modelView = mult(view, model);
    gl.uniformMatrix4fv(
      gl.getUniformLocation(program, "modelViewMatrix"),
      false,
      flatten(modelView),
    );

    gl.drawArrays(gl.TRIANGLES, 0, m.numVertices);
  }
}

function render() {
  renderScene(false);
}

function performPick(evt) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor(
    (evt.clientX - rect.left) * (texHeight / canvas.clientWidth),
  );
  const y = Math.floor(
    (rect.bottom - evt.clientY) * (texWidth / canvas.clientHeight),
  );

  gl.bindFramebuffer(gl.FRAMEBUFFER, pickFramebuffer);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  renderScene(true);

  const pixels = new Uint8Array(4);
  gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  const id = colorBytesToId(pixels);
  if (id === 0) {
  } else {
    const picked = models.find((m) => m.pickId === id);
    if (picked) {
      picked.material.diffuse = vec3(
        Math.random(),
        Math.random(),
        Math.random(),
      );
    }
  }

  renderScene(false);
}
