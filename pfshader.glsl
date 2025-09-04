#version 300 es
precision highp float;

uniform vec3 ambientProduct, diffuseProduct, specularProduct;
uniform float shininess;

uniform int uPicking;
uniform vec3 uPickColor;

in vec3 vN, vL1, vE;
in float dist1;
out vec4 fColor;

void main() {
  if (uPicking == 1) {
    fColor = vec4(uPickColor, 1.0);
    return;
  }

  vec3 N = normalize(vN);
  vec3 E = normalize(vE);
  vec3 L = normalize(vL1);
  vec3 H = normalize(L + E);

  float att = 5.0 / dist1;
  float diffuseTerm = max(dot(L, N), 0.0);
  vec3 diffuse = diffuseTerm * diffuseProduct;
  float specularTerm = pow(max(dot(N, H), 0.0), shininess);
  vec3 specular = specularTerm * specularProduct;
  if (dot(L, N) < 0.0) specular = vec3(0.0);
  vec3 color = ambientProduct + att * (diffuse + specular);
  fColor = vec4(color, 1.0);
}

