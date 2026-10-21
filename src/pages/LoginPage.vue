<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { signIn, backendEnabled } from '../auth'

const username = ref(''), password = ref(''), visible = ref(false), error = ref('')
const route = useRoute()
const busy = ref(false)
async function submit() {
  if (busy.value) return
  busy.value = true
  try {
  error.value = ''
  if (!await signIn(username.value, password.value)) {
    error.value = 'Incorrect username or password. Please try again.'
    return
  }
  const destination = route.query.redirect
  window.location.replace(typeof destination === 'string' && destination.startsWith('/') && !destination.startsWith('//') && !destination.startsWith('/login') ? destination : '/dashboard')
  } catch (failure) { error.value = failure.message || 'Could not connect. Please retry.' }
  finally { busy.value = false }
}
</script>

<template>
  <div class="login-page">
    <section class="login-story" aria-label="Calypso digital twin">
      <a class="login-brand" href="/login" aria-label="Calypso home"><img src="/brand.png" alt="Calypso" /></a>
      <div class="login-story-copy">
        <span class="login-kicker"><span></span> CONNECTED BUILDINGS. ONE SYSTEM.</span>
        <h1>Your buildings.<br />A clearer <em>perspective.</em></h1>
        <p>Manage systems, energy, and operations across all your buildings in one intelligent workspace.</p>
      </div>
      <div class="building-art" aria-hidden="true">
        <div class="building-orbit orbit-one"></div><div class="building-orbit orbit-two"></div>
        <svg viewBox="0 0 640 330" fill="none">
          <defs><linearGradient id="tower" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#376879"/><stop offset="1" stop-color="#142a3c"/></linearGradient><pattern id="windows" width="22" height="24" patternUnits="userSpaceOnUse"><path d="M8 4v12" stroke="#70dacb" stroke-opacity=".48" stroke-width="3"/></pattern></defs>
          <path d="M40 247 310 100 605 246 338 390Z" fill="#182f40" stroke="#457b83"/>
          <path d="m65 264 262-142M124 291 384 147M184 318 442 176M97 216l268 134M157 183l269 134M221 149l268 134" stroke="#4c9690" stroke-opacity=".18"/>
          <path d="M132 236V123l85-44 79 40v115l-85 45Z" fill="url(#tower)" stroke="#5b9b9f"/><path d="m132 123 79 40 85-44M211 163v116" stroke="#73b3af"/>
          <path d="M146 137v94l52 27v-94Z" fill="url(#windows)"/>
          <path d="M288 226V64l91-46 88 44v166l-91 47Z" fill="url(#tower)" stroke="#70aaa9"/><path d="m288 64 88 45 91-47M376 109v166" stroke="#8bc7bf"/>
          <path d="M302 83v134l61 32V113Z" fill="url(#windows)"/>
          <path d="M419 257v-95l65-33 65 32v98l-65 34Z" fill="url(#tower)" stroke="#5b9b9f"/><path d="m419 162 65 33 65-34M484 195v98" stroke="#73b3af"/>
          <path d="M432 179v71l40 21v-72Z" fill="url(#windows)"/>
          <path d="m218 291 71-38 68 35M376 18V0M549 161l33-18" stroke="#8ce1cc" stroke-dasharray="4 5"/>
          <circle cx="218" cy="291" r="5" fill="#8ce1cc"/><circle cx="357" cy="288" r="5" fill="#8ce1cc"/><circle cx="582" cy="143" r="5" fill="#8ce1cc"/>
        </svg>
        <div class="building-pill"><span></span> Multiple buildings. One system.</div>
      </div>
      <div class="login-story-footer"><span>BUILDING MANAGEMENT SYSTEM</span><span>Built for a smarter tomorrow <i class="fa-solid fa-arrow-up-right-from-square"></i></span></div>
    </section>

    <section class="login-panel">
      <div class="login-panel-top"><span>CALYPSO WORKSPACE</span><span class="login-access"><i class="fa-solid fa-shield-halved" aria-hidden="true"></i> Administrator access</span></div>
      <div class="login-form-wrap">
        <div class="login-symbol" aria-hidden="true"><i class="fa-solid fa-layer-group"></i></div>
        <p class="login-overline">WELCOME TO CALYPSO</p>
        <h2>Welcome back.</h2>
        <p class="login-intro">Sign in to see the bigger picture.</p>
        <form @submit.prevent="submit">
          <label for="login-username">Username</label>
          <div class="login-input"><i class="fa-regular fa-user" aria-hidden="true"></i><input id="login-username" v-model="username" name="username" autocomplete="username" placeholder="Enter your username" required @input="error = ''" /></div>
          <label for="login-password">Password</label>
          <div class="login-input"><i class="fa-solid fa-lock" aria-hidden="true"></i><input id="login-password" v-model="password" name="password" :type="visible ? 'text' : 'password'" autocomplete="current-password" placeholder="Enter your password" required @input="error = ''" /><button class="login-eye" type="button" :aria-label="visible ? 'Hide password' : 'Show password'" :aria-pressed="visible" @click="visible = !visible"><i :class="visible ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'" aria-hidden="true"></i></button></div>
          <p v-if="error" class="login-error" role="alert">{{ error }}</p>
          <button class="login-submit" type="submit" :disabled="busy" :aria-busy="busy">Sign in to workspace <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button>
        </form>
        <div v-if="!backendEnabled" class="login-demo"><i class="fa-solid fa-circle-info" aria-hidden="true"></i><div><strong>Workspace access</strong><p>Usernames <code>ST-Admin</code> or <code>PowerPlus-Admin</code><br />Password <code>admin</code> for both accounts</p></div></div>
        <p class="login-form-foot">A connected view. Better decisions.</p>
      </div>
      <div class="login-panel-footer"><span>© {{ new Date().getFullYear() }} Calypso</span><span>Building intelligence, simplified.</span></div>
    </section>
  </div>
</template>

<style scoped>
.login-page{min-height:100dvh;display:grid;grid-template-columns:1.08fr 1fr;background:#f8fafb;color:#172d3d}.login-story{position:relative;overflow:hidden;display:flex;flex-direction:column;padding:42px 54px 28px;background:radial-gradient(ellipse at 60% 65%,#214a50 0,transparent 55%),#102333;color:#fff}.login-brand{width:150px;display:block}.login-brand img{width:150px;height:75px;object-fit:contain}.login-story-copy{position:relative;z-index:1;margin-top:55px;max-width:490px}.login-kicker{display:flex;align-items:center;gap:9px;font-size:10px;letter-spacing:2.5px;color:#a5d4cf}.login-kicker span,.building-pill span{width:6px;height:6px;border-radius:50%;background:#8ee3c8;box-shadow:0 0 12px #8ee3c866}.login-story h1{font-size:clamp(36px,3.8vw,58px);line-height:1.14;letter-spacing:-2.5px;font-weight:500;margin:24px 0}.login-story h1 em{font-style:normal;color:#99e4d2}.login-story-copy>p{max-width:360px;font-size:14px;line-height:1.8;color:#a8bbc8}.building-art{position:relative;max-width:620px;width:100%;margin:auto;min-height:280px;display:grid;place-items:center}.building-art svg{position:relative;width:100%;z-index:1;overflow:visible}.building-orbit{position:absolute;border:1px solid #78bfb31c;border-radius:50%;width:85%;height:70%;transform:rotate(-20deg)}.orbit-two{width:110%;height:100%}.building-pill{position:absolute;bottom:12%;right:0;z-index:2;display:flex;align-items:center;gap:9px;padding:12px 16px;border:1px solid #689a9766;border-radius:8px;background:#1b3840dd;font-size:11px;color:#cee9e1;box-shadow:0 12px 35px #06162355}.login-story-footer{display:flex;justify-content:space-between;gap:16px;color:#7695a6;font-size:9px;letter-spacing:1.2px;margin-top:25px}.login-story-footer span:last-child{letter-spacing:0}.login-story-footer i{margin-left:7px;font-size:8px}.login-panel{display:flex;flex-direction:column;padding:44px 46px 28px}.login-panel-top,.login-panel-footer{display:flex;justify-content:space-between;align-items:center;gap:15px;color:#819099;font-size:10px}.login-panel-top>span:first-child{letter-spacing:1.8px;font-size:9px;font-weight:600}.login-access{display:flex;align-items:center;gap:7px}.login-access i{color:#559787}.login-form-wrap{width:100%;max-width:365px;margin:auto;padding:55px 0}.login-symbol{width:48px;height:48px;border:1px solid #d7e7e2;border-radius:14px;display:grid;place-items:center;background:#edf5f2;color:#397a6e;font-size:20px;margin-bottom:30px}.login-overline{font-size:9px;letter-spacing:2px;font-weight:600;color:#579082;margin:0 0 12px}.login-form-wrap h2{font-size:35px;letter-spacing:-1.2px;font-weight:600;margin:0 0 10px}.login-intro{font-size:13px;color:#7c8b95;margin:0 0 34px}.login-form-wrap label{display:block;font-size:12px;font-weight:600;margin:21px 0 9px}.login-input{display:flex;align-items:center;gap:12px;min-height:51px;border:1px solid #dce4e8;border-radius:8px;background:white;padding:0 15px;transition:border-color .2s,box-shadow .2s}.login-input:focus-within{border-color:#5cae9b;box-shadow:0 0 0 3px #5cae9b15}.login-input>i{color:#93a5ae;font-size:13px}.login-input input{width:100%;min-width:0;border:0;outline:none;background:transparent;color:#172d3d;font-size:12px;padding:16px 0}.login-input input:focus-visible{outline:none}.login-input input::placeholder{color:#a0acb4}.login-page button.login-eye{padding:6px;border:0;background:transparent;color:#8a9da7;font-size:13px}.login-eye i{margin:0}.login-page button.login-submit{margin-top:27px;width:100%;padding:17px 20px;border:0;border-radius:8px;display:flex;align-items:center;justify-content:space-between;background:#214c45;color:white;font-size:12px;font-weight:600;box-shadow:0 6px 15px #214c451a}.login-page button.login-submit:hover{background:#2b6358;filter:none}.login-submit i{margin:0}.login-error{font-size:12px;line-height:1.5;color:#b74242;margin:12px 0 0}.login-demo{display:flex;gap:11px;margin-top:23px;border:1px solid #e2e9ec;border-radius:8px;padding:14px;background:#f0f4f5;color:#78909c}.login-demo>i{font-size:13px;margin-top:2px}.login-sample strong{font-size:11px;font-weight:500;color:#526b78}.login-sample p{font-size:10px;margin:6px 0 0;color:#7a8e98}.login-sample code{font-family:inherit;color:#355e55;font-weight:600}.login-sample p span{padding:0 7px;color:#b2c0c7}.login-form-foot{text-align:center;font-size:10px;color:#9aa8b0;margin:28px 0 0}.login-panel-footer{font-size:9px}
@media(min-width:1500px){.login-story{padding:50px 75px 32px}.login-story-copy{margin-top:80px}.building-art{max-width:670px}.login-form-wrap{max-width:390px}}
@media(max-width:1000px){.login-story{padding:32px}.login-panel{padding:32px}.login-story h1{font-size:40px}.login-panel-top{align-items:flex-start;flex-direction:column}.login-story-footer span:last-child{display:none}}
@media(max-width:700px){.login-page{grid-template-columns:1fr}.login-story{padding:20px 26px 30px}.login-brand img{width:115px;height:52px}.login-story-copy{margin-top:20px}.login-story h1{font-size:34px;letter-spacing:-1.4px;margin:16px 0}.login-story-copy>p{font-size:12px;margin-bottom:0}.building-art,.login-story-footer{display:none}.login-panel{padding:25px 26px}.login-panel-top{flex-direction:row}.login-panel-top>span:first-child{font-size:8px}.login-access{font-size:9px}.login-form-wrap{padding:32px 0;max-width:420px}.login-symbol{display:none}.login-form-wrap h2{font-size:30px}.login-intro{margin-bottom:25px}.login-panel-footer{font-size:8px}}
</style>
