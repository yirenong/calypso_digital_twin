// Generates local, silent surveillance-style demo clips; no remote media needed.
import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage()
await mkdir('public/media', { recursive: true })
for (const scene of ['lobby', 'parking']) {
  const bytes = await page.evaluate(async scene => {
    const canvas = document.createElement('canvas')
    canvas.width = 960; canvas.height = 540
    const ctx = canvas.getContext('2d')
    function polygon(points, color) {
      ctx.fillStyle = color; ctx.beginPath(); points.forEach(([x,y], i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.closePath(); ctx.fill()
    }
    function box(x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(x,y,w,h) }
    function person(x,y,scale,phase,color) {
      ctx.save(); ctx.translate(x,y); ctx.scale(scale,scale)
      ctx.fillStyle='#20242a25';ctx.beginPath();ctx.ellipse(6,10,15,6,-.3,0,Math.PI*2);ctx.fill()
      ctx.fillStyle='#b9a690';ctx.beginPath();ctx.arc(0,-45,6,0,Math.PI*2);ctx.fill()
      ctx.strokeStyle=color;ctx.lineWidth=10;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,-35);ctx.lineTo(0,-15);ctx.stroke()
      ctx.lineWidth=4;ctx.strokeStyle='#343d43';ctx.beginPath();ctx.moveTo(0,-15);ctx.lineTo(Math.sin(phase)*8,4);ctx.moveTo(0,-15);ctx.lineTo(-Math.sin(phase)*8,4);ctx.stroke()
      ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(0,-33);ctx.lineTo(11,-18+Math.cos(phase)*4);ctx.moveTo(0,-33);ctx.lineTo(-10,-18-Math.cos(phase)*4);ctx.stroke();ctx.restore()
    }
    function car(x,y,color,scale=1) {
      ctx.save();ctx.translate(x,y);ctx.scale(scale,scale)
      box(3,5,54,99,'#171d2440');box(0,0,52,92,color);box(5,17,42,22,'#293843');box(6,62,40,15,'#354551');box(4,39,44,22,color)
      box(-3,19,4,17,'#222');box(51,19,4,17,'#222');box(-3,65,4,16,'#222');box(51,65,4,16,'#222');box(5,3,9,4,'#e7e7ce');box(38,3,9,4,'#e7e7ce');ctx.restore()
    }
    function draw(t) {
      if(scene==='lobby') {
        box(0,0,960,540,'#a9b3b7');box(0,0,960,190,'#bcc5c6');polygon([[0,540],[960,540],[760,195],[225,195]],'#8d999f');polygon([[0,0],[225,60],[225,195],[0,540]],'#a1adae');polygon([[960,0],[760,55],[760,195],[960,540]],'#8b9699')
        for(let i=0;i<7;i++){let y=200+i*i*8;ctx.strokeStyle='#717f8555';ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(960,y);ctx.stroke()}
        for(let x=-400;x<1400;x+=135){ctx.strokeStyle='#74828a55';ctx.beginPath();ctx.moveTo(490+(x-490)*.3,195);ctx.lineTo(x,540);ctx.stroke()}
        box(318,62,321,139,'#64777e');for(let x=327;x<630;x+=76){box(x,69,66,115,'#96b0b855');box(x+32,73,3,110,'#c3ccca')}
        box(440,110,70,89,'#566c75');box(473,113,3,82,'#abbdbd');box(519,176,64,22,'#52636a');box(60,308,127,35,'#626c70');polygon([[60,308],[187,308],[195,326],[70,326]],'#78858a')
        box(717,230,120,46,'#5c6d73');polygon([[717,230],[837,230],[846,249],[727,249]],'#a9b5b8');box(230,89,23,151,'#bac5c3');box(686,91,24,158,'#b5bfbd')
        box(270,174,20,22,'#556966');box(660,173,21,24,'#506561');for(let i=0;i<10;i++){box(265+i*3,150+(i%3)*6,4,26,'#526b5e');box(656+i*3,152+(i%3)*5,4,25,'#526b5e')}
        person(355+t*31,280+t*9,1.05, t*5,'#415a68');person(650-t*27,420-t*17,1.3,t*5+2,'#6d6865')
      } else {
        box(0,0,960,540,'#5d666b');box(0,0,960,94,'#9aa5a3');box(0,90,960,18,'#7b8585');box(0,110,960,430,'#616b71');box(0,108,75,432,'#798c78');box(895,108,65,432,'#798c78')
        for(let row=0;row<2;row++)for(let col=0;col<7;col++){let x=110+col*104,y=145+row*275;ctx.strokeStyle='#c6c9bd';ctx.lineWidth=2;ctx.strokeRect(x,y,79,110)}
        for(let x=75;x<900;x+=100)box(x,333,48,4,'#d4d3bd');box(91,267,790,3,'#b8b9ac');box(91,401,790,3,'#b8b9ac')
        car(122,151,'#b9bdbb');car(335,153,'#455c6e');car(650,151,'#a7a29b');car(750,151,'#657277');car(225,423,'#9faaa8');car(538,423,'#535f66');car(746,423,'#aaa697')
        ctx.save();ctx.translate(180+t*75,315);ctx.rotate(-Math.PI/2);car(0,0,'#b2a998',.85);ctx.restore();person(820-t*17,115+t*10,.85,t*5,'#3f596a')
      }
      // Restrained grain and a CCTV-like vignette.
      ctx.fillStyle='#d5e2df07';for(let y=0;y<540;y+=3)ctx.fillRect(0,y,960,1)
      const vignette=ctx.createRadialGradient(480,270,100,480,270,580);vignette.addColorStop(0,'#0000');vignette.addColorStop(1,'#11182055');ctx.fillStyle=vignette;ctx.fillRect(0,0,960,540)
    }
    draw(0)
    const stream=canvas.captureStream(15)
    const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8',videoBitsPerSecond:1000000})
    const chunks=[];recorder.ondataavailable=e=>chunks.push(e.data)
    const stopped=new Promise(resolve=>recorder.onstop=resolve)
    recorder.start();const start=performance.now();let animation
    function frame(){const time=(performance.now()-start)/1000;draw(time);if(time<8)animation=requestAnimationFrame(frame);else recorder.stop()}
    frame();await stopped;cancelAnimationFrame(animation);stream.getTracks().forEach(t=>t.stop())
    const buffer=await new Blob(chunks,{type:'video/webm'}).arrayBuffer()
    return Array.from(new Uint8Array(buffer))
  }, scene)
  await writeFile(`public/media/cctv-${scene}.webm`, Buffer.from(bytes))
  console.log(`${scene}: ${bytes.length} bytes`)
}
await browser.close()
