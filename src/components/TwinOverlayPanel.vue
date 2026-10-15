<script setup>
import { computed, inject, onMounted, onBeforeUnmount, ref } from 'vue'
const props=defineProps({id:String,title:String,x:Number,y:Number,forceVisible:Boolean,scrollable:{type:Boolean,default:true}})
const api=inject('twin-panel-layout'),panel=ref(null),collapsed=ref(false)
const editing=api.editing
const position=computed(()=>api.layout.value[props.id])
const width=computed(()=>position.value.width || (props.scrollable?320:520))
const ready=ref(false)
onMounted(()=>{ready.value=true})
const dock=computed(()=>position.value.dock || 'left')
const dragPreview=ref(null)
let drag,resize
const placement=computed(()=>{if(dragPreview.value)return{position:'fixed',left:dragPreview.value.left+'px',top:dragPreview.value.top+'px',width:dragPreview.value.width+'px',zIndex:30};if(!position.value.edgePlaced)return{};const x=position.value.dock==='left'?0:position.value.dock==='right'?1:position.value.x;const y=position.value.dock==='bottom'?1:position.value.y;return{position:'absolute',left:(x*100)+'%',top:'max(0px, calc('+y*100+'% - '+y*(position.value.height || 360)+'px))',transform:'translateX(-'+x*100+'%)'}})
onMounted(()=>api.registerPosition(props.id,()=>{if(!position.value.enabled || !panel.value)return null;const area=panel.value.parentElement,rect=panel.value.getBoundingClientRect(),bounds=area.getBoundingClientRect();return{availableWidth:area.clientWidth,left:(rect.left-bounds.left+area.scrollLeft)/area.clientWidth,top:(rect.top-bounds.top+area.scrollTop)/area.clientHeight}}))
onBeforeUnmount(()=>api.unregisterPosition(props.id))
const fixedAnchor=computed(()=>Number.isFinite(position.value.left)&&Number.isFinite(position.value.top))
function startDrag(e){
 if(e.button!==0||!editing.value)return
 const r=panel.value.getBoundingClientRect()
 drag={id:e.pointerId,offsetX:e.clientX-r.left,offsetY:e.clientY-r.top,width:r.width,height:r.height,area:panel.value.closest('.twin-overlays')}
 e.currentTarget.setPointerCapture(e.pointerId)
}
function moveDrag(e){
 if(!drag||drag.id!==e.pointerId)return
 const r=drag.area.getBoundingClientRect()
 const left=Math.max(r.left,Math.min(r.right-drag.width,e.clientX-drag.offsetX))
 const top=Math.max(r.top,Math.min(r.bottom-drag.height,e.clientY-drag.offsetY))
 dragPreview.value={left,top,width:drag.width}
 const distances={left:left-r.left,right:r.right-left-drag.width,bottom:r.bottom-top-drag.height}
 const dock=Object.keys(distances).reduce((a,b)=>distances[a]<=distances[b]?a:b)
 drag.next={dock,edgePlaced:true,x:(left-r.left)/Math.max(1,r.width-drag.width),y:(top-r.top)/Math.max(1,r.height-drag.height)}
}
function stopDrag(){const next=drag?.next;drag=null;dragPreview.value=null;if(next)api.update(props.id,next)}
function keyboard(e){if(!editing.value)return;const next={ArrowLeft:'left',ArrowRight:'right',ArrowDown:'bottom'}[e.key];if(next){e.preventDefault();api.update(props.id,{dock:next})}}
function startResize(e){if(e.button!==0)return;const r=panel.value.getBoundingClientRect();resize={id:e.pointerId,x:e.clientX,y:e.clientY,w:r.width,h:r.height};e.currentTarget.setPointerCapture(e.pointerId)}
function moveResize(e){if(resize&&resize.id===e.pointerId)api.resizePanel(props.id,resize.w+e.clientX-resize.x,resize.h+e.clientY-resize.y)}
function resizeKeyboard(e){const d={ArrowLeft:[-20,0],ArrowRight:[20,0],ArrowUp:[0,-20],ArrowDown:[0,20]}[e.key];if(!d)return;e.preventDefault();const r=panel.value.getBoundingClientRect();api.resizePanel(props.id,r.width+d[0],r.height+d[1])}
</script>
<template>
<Teleport v-if="ready" :to="position.edgePlaced?'.twin-overlays':`#twin-dock-${dock}`"><section v-show="position.enabled || forceVisible" ref="panel" class="twin-overlay-panel" :class="{editing,collapsed,sized:position.height&&!collapsed,'chart-panel':!scrollable&&!collapsed}" :data-panel="id" :aria-label="title" :style="{'--panel-width':width+'px','--panel-height':(position.height || 360)+'px',order:position.order,...placement}">
<header><button class="panel-grip" :aria-label="`Move ${title} panel`" title="Drag to move; arrow keys also work" @pointerdown="startDrag" @pointermove="moveDrag" @pointerup="stopDrag" @pointercancel="stopDrag" @lostpointercapture="stopDrag" @keydown="keyboard"><i v-if="editing" aria-hidden="true" class="fa-solid fa-grip-vertical"></i><span>{{title.split(' · ')[0]}}</span></button><button class="panel-collapse" :aria-label="`${collapsed?'Expand':'Collapse'} ${title} panel`" @click="collapsed=!collapsed"><i aria-hidden="true" :class="collapsed?'fa-solid fa-plus':'fa-solid fa-minus'"></i></button></header>
<div v-show="!collapsed" class="panel-content"><slot/></div>
<footer v-if="editing"><select :value="dock" :aria-label="`Dock ${title} panel`" @change="api.update(id,{dock:$event.target.value,edgePlaced:false})"><option value="left">Left</option><option value="bottom">Bottom</option><option value="right">Right</option></select><button :aria-label="`Remove ${title} panel`" @click="api.remove(id)"><i aria-hidden="true" class="fa-solid fa-xmark"></i> Remove</button><button v-if="!collapsed" class="resize-panel" :aria-label="`Resize ${title} panel`" title="Drag to resize; arrow keys also work" @pointerdown="startResize" @pointermove="moveResize" @pointerup="resize=null" @pointercancel="resize=null" @lostpointercapture="resize=null" @keydown="resizeKeyboard"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 20 20"><path d="M5 15L15 5M10 15H15V10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></footer>
</section></Teleport>
</template>
<style scoped>
.twin-overlay-panel{box-sizing:border-box;position:relative;flex-shrink:0;display:flex;flex-direction:column;width:min(var(--panel-width),100%);min-width:0;overflow:hidden;pointer-events:auto;border:1px solid #b8d9ee30;border-radius:10px;background:#102031b0;backdrop-filter:none;color:#edf7ff;box-shadow:0 5px 20px #0003;z-index:2}
.twin-overlay-panel:focus-within{z-index:5}.editing{border-color:#65bdd470}header{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #ffffff16;flex-shrink:0}header .panel-grip{flex:1;min-width:0;display:flex;gap:8px;align-items:center;text-align:left;font-size:11px;border:0;background:transparent;padding:10px;color:inherit;touch-action:none;cursor:default}.editing .panel-grip{cursor:grab}button i{margin:0}header .panel-collapse{display:grid;place-items:center;width:28px;height:28px;padding:0;margin:4px;border:0;background:#ffffff08;color:#badbe8}.panel-content{padding:12px;overflow:auto;min-height:0;scrollbar-width:thin}.sized,.chart-panel{height:var(--panel-height)}.sized .panel-content,.chart-panel .panel-content{flex:1;max-height:none}.chart-panel .panel-content{display:flex;flex-direction:column;overflow:hidden}footer{display:flex;justify-content:space-between;align-items:center;padding:5px;border-top:1px solid #ffffff16;flex-shrink:0}footer button{font-size:10px;padding:5px 8px}footer .resize-panel{display:grid;place-items:center;width:28px;height:28px;padding:0;cursor:nwse-resize;touch-action:none;color:#8fddf2;background:#203d50}


.twin-overlay-panel footer { margin:0; border-top:0; padding:6px 8px; gap:8px; }
.twin-overlay-panel .panel-content { padding-bottom:16px; scroll-padding-bottom:16px; }
.twin-overlay-panel footer button.resize-panel { display:flex; align-items:center; justify-content:center; flex:0 0 30px; width:30px; min-width:30px; height:30px; padding:0; margin:0; line-height:1; box-sizing:border-box; }
.twin-overlay-panel footer button.resize-panel svg { display:block; flex:0 0 16px; width:16px; height:16px; margin:0; padding:0; }
</style>
<style scoped>
.twin-overlay-panel { border-radius:4px; border-color:#9dc7dd26; background:linear-gradient(120deg,#0a1a2bd4,#10253680); backdrop-filter:none; box-shadow:0 3px 16px #0003; }
header { border-left:2px solid var(--twin-accent,#72d6e8); background:#08172570; }
header .panel-grip { text-transform:uppercase; letter-spacing:.8px; font-size:10px; padding:10px; }
header .panel-collapse { border-radius:2px; color:var(--twin-accent,#72d6e8); }
</style>
