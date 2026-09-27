import React, { useEffect, useRef } from "react";

// A small, dependency-free WebGL contour field. The CSS background is the fallback.
export default function Ambient() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      powerPreference: "low-power",
    });
    if (!gl) return;
    const shaders = [];
    function shader(type, source) {
      const s = gl.createShader(type);
      shaders.push(s);
      gl.shaderSource(s, source);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        throw new Error("Shader compilation failed");
      return s;
    }
    let program, buffer;
    try {
      program = gl.createProgram();
      gl.attachShader(
        program,
        shader(
          gl.VERTEX_SHADER,
          "attribute vec2 p; void main(){gl_Position=vec4(p,0.,1.);}",
        ),
      );
      gl.attachShader(
        program,
        shader(
          gl.FRAGMENT_SHADER,
          `precision mediump float;
        uniform vec2 size; uniform float time;
        void main(){
          vec2 uv=gl_FragCoord.xy/size; vec2 p=(uv-.5)*vec2(size.x/size.y,1.);
          float d=length(p*vec2(.58,1.4)+vec2(.0,.35));
          float warp=sin(p.x*5.+time*.13)*.04+sin(p.y*9.-time*.1)*.025;
          float wave=abs(sin((d+warp)*82.));
          float line=1.-smoothstep(.025,.095,wave);
          float fade=smoothstep(.1,.9,abs(uv.x-.5)*2.)*(1.-uv.y*.6);
          float alpha=line*fade*.17;
          gl_FragColor=vec4(vec3(.59,.76,.40)*alpha,alpha);
        }`,
        ),
      );
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw new Error("Shader linking failed");
      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW,
      );
      gl.useProgram(program);
      const p = gl.getAttribLocation(program, "p");
      gl.enableVertexAttribArray(p);
      gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);
    } catch {
      shaders.forEach((s) => gl.deleteShader(s));
      if (program) gl.deleteProgram(program);
      return;
    }
    const size = gl.getUniformLocation(program, "size"),
      time = gl.getUniformLocation(program, "time");
    let raf = 0,
      last = -100,
      visible = true,
      lost = false;
    function draw(t = 0) {
      raf = 0;
      if (lost || document.hidden || !visible) return;
      if (t - last > 50 || media.matches) {
        last = t;
        gl.uniform2f(size, canvas.width, canvas.height);
        gl.uniform1f(time, t / 1000);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      if (!media.matches) raf = requestAnimationFrame(draw);
    }
    function restart() {
      cancelAnimationFrame(raf);
      last = -100;
      draw();
    }
    const resize = new ResizeObserver(() => {
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(r.width));
      canvas.height = Math.max(1, Math.round(r.height));
      gl.viewport(0, 0, canvas.width, canvas.height);
      restart();
    });
    resize.observe(canvas);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      restart();
    });
    observer.observe(canvas);
    const onLost = () => {
      lost = true;
      cancelAnimationFrame(raf);
    };
    canvas.addEventListener("webglcontextlost", onLost);
    document.addEventListener("visibilitychange", restart);
    media.addEventListener("change", restart);
    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
      observer.disconnect();
      document.removeEventListener("visibilitychange", restart);
      media.removeEventListener("change", restart);
      canvas.removeEventListener("webglcontextlost", onLost);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      shaders.forEach((s) => gl.deleteShader(s));
    };
  }, []);
  return <canvas className="ambient" ref={ref} aria-hidden="true" />;
}
