import { useEffect, useRef } from "react";

const VERT = `
attribute vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAG = `
precision mediump float;

uniform vec2 iResolution;
uniform float iTime;

#define PI 3.1415927

float Hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {

    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    vec3 col = vec3(0.0);

    float c = cos(iTime);
    float s = sin(iTime);

    float l = length(uv + 0.1 * vec2(c, s));

    uv *= 100.0;

    vec2 gv = fract(uv) - 0.5;
    vec2 id = floor(uv);

    float n = Hash21(id);

    float d = length(gv - (vec2(n, fract(n * 10.0)) - 0.5));

    float star = smoothstep(
        0.1,
        0.05,
        d * (10.0 + 5.0 * sin(iTime + n * 6.28))
    );

    col += star * n;


    l=l<0.2? l+0.0:1.0-l;
   

    




    float t = iTime * 2.0;

    l = pow(10.0, l) / 10.0;

    vec4 colour = vec4(
        cos(t + l),
        cos(l + t + PI * 0.333),
        cos(l + t + 2.0 * PI * 0.333),
        1.0
    );

    fragColor =
        vec4(col, 1.0)
        + l * (colour+3.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
`;

function compileShader(gl, type, source) {

  const shader = gl.createShader(type);

  gl.shaderSource(shader, source);

  gl.compileShader(shader);

  return shader;
}

function ShaderBackground() {

  const canvasRef = useRef(null);

  useEffect(() => {

    const canvas = canvasRef.current;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
    });

    if (!gl) return;

    const program = gl.createProgram();

    gl.attachShader(
      program,
      compileShader(gl, gl.VERTEX_SHADER, VERT)
    );

    gl.attachShader(
      program,
      compileShader(gl, gl.FRAGMENT_SHADER, FRAG)
    );

    gl.linkProgram(program);

    gl.useProgram(program);

    const buffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,

        -1,  1,
         1, -1,
         1,  1
      ]),
      gl.STATIC_DRAW
    );

    const position = gl.getAttribLocation(
      program,
      "a_position"
    );

    gl.enableVertexAttribArray(position);

    gl.vertexAttribPointer(
      position,
      2,
      gl.FLOAT,
      false,
      0,
      0
    );

    const resize = () => {

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      gl.viewport(
        0,
        0,
        canvas.width,
        canvas.height
      );
    };

    resize();

    window.addEventListener("resize", resize);

    const start = performance.now();

    let raf;

    const render = () => {

      const time =
        (performance.now() - start) / 1000;

      gl.uniform2f(
        gl.getUniformLocation(program, "iResolution"),
        canvas.width,
        canvas.height
      );

      gl.uniform1f(
        gl.getUniformLocation(program, "iTime"),
        time
      );

      gl.clearColor(0, 0, 0, 1);

      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      raf = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };

  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
      }}
    />
  );
}

export default function Home() {

  return (
    <>
      <style>{`

        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Exo+2:wght@300;400;500&display=swap');

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          background: #000;
          overflow: hidden;
        }

        .overlay {

          position: fixed;
          inset: 0;

          z-index: 1;

          background:
            radial-gradient(
              circle at center,
              rgba(0,0,0,0.15),
              rgba(0,0,0,0.75)
            );
        }

        .content {

          position: relative;
          z-index: 2;

          min-height: 100vh;

          display: flex;
          flex-direction: column;

          align-items: center;
          justify-content: center;

          text-align: center;

          padding: 24px;
        }

        .logo-wrap {

          animation:
            fadeDown 1s ease forwards;
        }

        .title {

          font-family: 'Orbitron', monospace;

          font-size: clamp(3rem, 10vw, 7rem);

          font-weight: 900;

          letter-spacing: 0.28em;

          color: white;

          margin-bottom: 20px;

          text-shadow:
            0 0 30px rgba(120,80,255,0.9),
            0 0 70px rgba(120,80,255,0.45),
            0 0 140px rgba(120,80,255,0.2);
        }

        .subtitle {

          font-family: 'Exo 2', sans-serif;

          font-size: 0.9rem;

          letter-spacing: 0.55em;

          text-transform: uppercase;

          color: rgba(220,220,255,0.6);

          margin-bottom: 58px;
        }

        .buttons {

          display: flex;

          gap: 20px;

          flex-wrap: wrap;

          justify-content: center;

          animation:
            fadeUp 1s 0.25s ease both;
        }

        .btn {

          position: relative;

          overflow: hidden;

          padding: 16px 42px;

          border-radius: 14px;

          text-decoration: none;

          font-family: 'Orbitron', monospace;

          font-size: 0.82rem;

          font-weight: 700;

          letter-spacing: 0.22em;

          transition:
            transform 0.18s,
            box-shadow 0.18s,
            border-color 0.18s;
        }

        .btn:hover {
          transform: translateY(-3px);
        }

        .btn-register {

          background:
            linear-gradient(
              135deg,
              #7c4dff,
              #5b21ff
            );

          color: white;

          border: 1px solid rgba(255,255,255,0.08);

          box-shadow:
            0 0 35px rgba(124,77,255,0.45);
        }

        .btn-register:hover {

          box-shadow:
            0 0 60px rgba(124,77,255,0.75);
        }

        .btn-login {

          background:
            rgba(255,255,255,0.04);

          border:
            1px solid rgba(167,139,250,0.25);

          backdrop-filter: blur(12px);

          color: #d7cbff;
        }

        .btn-login:hover {

          border-color:
            rgba(167,139,250,0.6);

          box-shadow:
            0 0 35px rgba(167,139,250,0.22);
        }

        .grid {

          position: fixed;
          inset: 0;

          z-index: 1;

          background-image:
            linear-gradient(
              rgba(255,255,255,0.03) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(255,255,255,0.03) 1px,
              transparent 1px
            );

          background-size: 70px 70px;

          mask-image:
            radial-gradient(
              circle at center,
              black 30%,
              transparent 85%
            );

          pointer-events: none;
        }

        @keyframes fadeDown {

          from {
            opacity: 0;
            transform: translateY(-30px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeUp {

          from {
            opacity: 0;
            transform: translateY(30px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 640px) {

          .title {
            letter-spacing: 0.14em;
          }

          .subtitle {
            letter-spacing: 0.3em;
            font-size: 0.75rem;
          }

          .btn {
            width: 100%;
            max-width: 280px;
          }

          .buttons {
            width: 100%;
          }
        }

      `}</style>

      <ShaderBackground />

      <div className="grid" />

      <div className="overlay" />

      <div className="content">

        <div className="logo-wrap">

          <div className="title">
            UniConqueror
          </div>

          <div className="subtitle">
            conquer the galaxy
          </div>

        </div>

        <div className="buttons">

          <a
            className="btn btn-register"
            href="/register"
          >
            Register
          </a>

          <a
            className="btn btn-login"
            href="/login"
          >
            Login
          </a>

        </div>

      </div>
    </>
  );
}