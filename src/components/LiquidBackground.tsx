import { useEffect, useRef } from 'react'

/* Fondo animado en WebGL, sin dependencias. Dos variantes sobre la misma paleta
   de marca (brand-950 al fondo, brand-500 en los brillos, lavanda de espuma):

     'liquido' — flujo denso, con vetas y brillo de superficie.
     'humo'    — plumas que suben y se disuelven arriba.

   Va dentro de un contenedor `relative` con el contenido por encima.

   Regla de la app (ver styles.css): nada visible puede depender de JS. Por eso
   el canvas trae pintado un degradado CSS equivalente — es lo que se ve en el
   HTML del SSR, si WebGL falla, o mientras compila el shader. */

export type LiquidVariant = 'liquido' | 'humo'

const VS = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`

/** Ruido simplex + fbm, paleta y acabado: lo que comparten las dos variantes. */
const PRELUDE = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 u_res; uniform float u_time; uniform vec2 u_mouse; uniform float u_int;

vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}
vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}
float snoise(vec2 v){
  const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
  vec2 i=floor(v+dot(v,C.yy)); vec2 x0=v-i+dot(i,C.xx);
  vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
  vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1; i=mod289(i);
  vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
  vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);
  m=m*m; m=m*m;
  vec3 x=2.0*fract(p*C.www)-1.0; vec3 h=abs(x)-0.5; vec3 ox=floor(x+0.5); vec3 a0=x-ox;
  m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
  vec3 g; g.x=a0.x*x0.x+h.x*x0.y; g.yz=a0.yz*x12.xz+h.yz*x12.yw;
  return 130.0*dot(m,g);
}
float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<5;i++){v+=a*snoise(p);p*=2.03;a*=0.5;}return v;}

// Rampa Gerundio: brand-950, brand-900, brand-700, brand-500, brand-200, cielo-200.
const vec3 ABYSS=vec3(0.008,0.000,0.165);
const vec3 DEEP =vec3(0.035,0.000,0.345);
const vec3 BLUE =vec3(0.129,0.122,0.706);
const vec3 GLOW =vec3(0.275,0.373,1.000);
const vec3 FOAM =vec3(0.851,0.871,1.000);
const vec3 CIELO=vec3(0.478,0.969,1.000);

// Viñeta + grano. El grano no es decorativo: rompe el banding que hace un
// degradado tan plano en pantallas de 8 bits.
vec3 finish(vec3 col, float vig){
  vec2 uv=gl_FragCoord.xy/u_res;
  col*=1.0-vig*pow(length((uv-0.5)*vec2(1.25,1.0)),2.2);
  col+=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-0.5)*0.018;
  return col;
}
`

/** Líquido: dos warps del dominio, brillo de superficie y vetas finas. */
const MAIN_LIQUIDO = `
void main(){
  vec2 p=(gl_FragCoord.xy-0.5*u_res)/min(u_res.x,u_res.y);
  float t=u_time*0.075;
  vec2 mo=(u_mouse-0.5)*0.45;

  vec2 q=vec2(fbm(p*1.6+t), fbm(p*1.6+vec2(5.2,1.3)-t*0.6));
  vec2 r=vec2(fbm(p*1.6+2.2*q+vec2(1.7,9.2)+0.16*t+mo),
              fbm(p*1.6+2.2*q+vec2(8.3,2.8)-0.13*t-mo));
  float f=fbm(p*1.6+2.4*r*u_int);

  vec3 col=mix(ABYSS,DEEP,clamp(f*0.5+0.5,0.0,1.0));
  col=mix(col,BLUE,clamp(length(q)*0.72,0.0,1.0));
  col=mix(col,GLOW,clamp(r.x*r.x*1.15,0.0,1.0));

  float sheen=smoothstep(0.52,1.02,f*0.5+0.5+0.3*r.y);
  col=mix(col,FOAM,sheen*0.58);

  float veins=smoothstep(0.015,0.0,abs(f*0.5+0.5-0.62));
  col+=CIELO*veins*0.18;

  gl_FragColor=vec4(finish(col,0.55),1.0);
}`

/** Humo: el mismo ruido, pero el dominio sube con el tiempo y la densidad se
    apaga hacia arriba, así la pluma se deshace en vez de repetirse. */
const MAIN_HUMO = `
void main(){
  vec2 p=(gl_FragCoord.xy-0.5*u_res)/min(u_res.x,u_res.y);
  float t=u_time*0.16;
  vec2 mo=(u_mouse-0.5)*0.5;

  // Estirado en y y desplazado en -y: las volutas ascienden y se alargan.
  vec2 sp=vec2(p.x*1.20, p.y*0.78-t*0.62);

  vec2 w1=vec2(fbm(sp*1.4+vec2(0.0,t*0.35)),
               fbm(sp*1.4+vec2(4.7,2.1)-t*0.22));
  vec2 w2=vec2(fbm(sp*2.1+1.8*w1+mo),
               fbm(sp*2.1+1.8*w1+vec2(3.1,7.4)-mo));
  float d=fbm(sp*1.7+2.6*w2*u_int)*0.5+0.5;

  // 1 abajo, 0 arriba: es lo que convierte una mancha de ruido en humo.
  // Va como 1.0-smoothstep y no con los bordes al revés porque con edge0>edge1
  // el resultado es indefinido según la spec (funciona, pero depende del driver).
  float fade=1.0-smoothstep(-0.30,1.05,p.y);
  d=pow(clamp(d*fade,0.0,1.0),1.45);

  vec3 col=mix(ABYSS,DEEP,smoothstep(0.04,0.46,d));
  col=mix(col,BLUE,smoothstep(0.30,0.74,d));
  col=mix(col,GLOW,smoothstep(0.62,0.98,d)*0.85);

  // Solo las crestas se aclaran: el humo es opaco, no espumoso.
  col=mix(col,FOAM,smoothstep(0.88,1.0,d)*0.45);

  // Foco bajo: luz atravesando la pluma desde la base.
  float source=1.0-smoothstep(0.0,0.95,length(p-vec2(0.0,-0.72)));
  col+=GLOW*source*d*0.16;

  gl_FragColor=vec4(finish(col,0.45),1.0);
}`

/** Degradado de respaldo: mismos colores, sin shader. */
const FALLBACK: Record<LiquidVariant, string> = {
  liquido:
    'radial-gradient(120% 100% at 30% 20%, var(--color-brand-800) 0%, var(--color-brand-900) 45%, var(--color-brand-950) 100%)',
  humo: 'radial-gradient(110% 85% at 50% 105%, var(--color-brand-700) 0%, var(--color-brand-900) 45%, var(--color-brand-950) 100%)',
}

interface Props {
  /** Qué se dibuja: flujo líquido o plumas de humo. */
  variant?: LiquidVariant
  /** Multiplicador de velocidad del flujo. 1 = calmado, 2 = agitado. */
  speed?: number
  /** Cuánto se deforma el ruido. 1 = orgánico, 2 = caótico. */
  turbulence?: number
  /** El fondo reacciona al cursor. */
  interactive?: boolean
  className?: string
}

export function LiquidBackground({
  variant = 'liquido',
  speed = 1,
  turbulence = 1,
  interactive = true,
  className = '',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Los ajustes viven en un ref para que cambiarlos no reinicie el contexto WebGL.
  // `variant` sí es dependencia del efecto: cambia el shader, hay que recompilar.
  const opts = useRef({ speed, turbulence, interactive })
  opts.current = { speed, turbulence, interactive }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = (canvas.getContext('webgl', { antialias: false, alpha: false }) ??
      canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null
    if (!gl) return // se queda el degradado CSS

    const compile = (type: number, src: string) => {
      const shader = gl.createShader(type)
      if (!shader) return null
      gl.shaderSource(shader, src)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn(gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
      }
      return shader
    }

    const vs = compile(gl.VERTEX_SHADER, VS)
    const fs = compile(
      gl.FRAGMENT_SHADER,
      PRELUDE + (variant === 'humo' ? MAIN_HUMO : MAIN_LIQUIDO),
    )
    const prog = gl.createProgram()
    if (!vs || !fs) return

    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn(gl.getProgramInfoLog(prog))
      return
    }
    gl.useProgram(prog)

    // Un solo triángulo que tapa el viewport: más barato que dos y sin costura.
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    )
    const loc = gl.getAttribLocation(prog, 'a')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const uRes = gl.getUniformLocation(prog, 'u_res')
    const uTime = gl.getUniformLocation(prog, 'u_time')
    const uMouse = gl.getUniformLocation(prog, 'u_mouse')
    const uInt = gl.getUniformLocation(prog, 'u_int')

    const motionQuery = matchMedia('(prefers-reduced-motion: reduce)')
    let reduced = motionQuery.matches
    const onMotionChange = (e: MediaQueryListEvent) => {
      reduced = e.matches
    }
    motionQuery.addEventListener('change', onMotionChange)

    const mouse = { x: 0.5, y: 0.5 }
    const target = { x: 0.5, y: 0.5 }
    // El humo arranca con recorrido hecho: si no, la primera pluma nace del
    // mismo sitio en cada carga y se ve el "encendido".
    let clock = variant === 'humo' ? 12 : 0
    let last = performance.now()
    let visible = true
    let alive = true
    let raf = 0

    const onMove = (e: PointerEvent) => {
      if (!opts.current.interactive || reduced) return
      target.x = e.clientX / innerWidth
      target.y = 1 - e.clientY / innerHeight
    }
    addEventListener('pointermove', onMove, { passive: true })

    // Solo dibuja mientras el fondo está en pantalla.
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
      },
      { threshold: 0 },
    )
    io.observe(canvas)

    // Si el navegador tira el contexto (GPU ocupada, pestaña dormida) se para el
    // bucle en vez de dibujar en el vacío; queda el degradado CSS.
    const onLost = (e: Event) => {
      e.preventDefault()
      alive = false
    }
    canvas.addEventListener('webglcontextlost', onLost)

    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 1.6)
      const w = Math.floor(canvas.clientWidth * dpr)
      const h = Math.floor(canvas.clientHeight * dpr)
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
      }
    }

    const render = (now: number) => {
      if (!alive) return
      raf = requestAnimationFrame(render)
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      if (!visible || document.hidden) return

      if (!reduced) clock += dt * opts.current.speed
      mouse.x += (target.x - mouse.x) * 0.045
      mouse.y += (target.y - mouse.y) * 0.045

      resize()
      gl.uniform2f(uRes, canvas.width, canvas.height)
      gl.uniform1f(uTime, clock)
      gl.uniform2f(uMouse, mouse.x, mouse.y)
      gl.uniform1f(uInt, opts.current.turbulence)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    raf = requestAnimationFrame(render)

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      io.disconnect()
      removeEventListener('pointermove', onMove)
      motionQuery.removeEventListener('change', onMotionChange)
      canvas.removeEventListener('webglcontextlost', onLost)
      gl.deleteProgram(prog)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.deleteBuffer(buf)
      // Sin esto, cada remontaje (StrictMode, cambiar de variante, volver al
      // login) deja un contexto vivo y el navegador solo permite ~16.
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [variant])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 block size-full ${className}`}
      style={{ background: FALLBACK[variant] }}
    />
  )
}
