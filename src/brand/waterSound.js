// Original local synthesis. No recording, microphone or downloaded music.
const SCALE = [62,64,66,69,71,74,76,78,81,83]
const MOTIF = [0,2,4,3,1,2,0,4]
const frequency = midi => 440 * 2 ** ((midi - 69) / 12)
export function createWaterSound(onState = () => {}) {
  let context,master,filter,timer,meterTimer,analyser,meterSamples,disposed=false,muted=false,hidden=document.hidden,paused=false,step=0,lastTouch=-Infinity
  const voices=new Set()
  function state(){let level=0;if(analyser&&context.state==='running'){analyser.getFloatTimeDomainData(meterSamples);for(const sample of meterSamples)level+=sample*sample;level=Math.sqrt(level/meterSamples.length)}onState(disposed?'closed':muted?'muted':!context?'waiting':context.state,level,voices.size)}
  function meter(){clearTimeout(meterTimer);meterTimer=undefined;state();if(!disposed&&!muted&&!hidden&&!paused&&context?.state==='running')meterTimer=setTimeout(meter,250)}
  function prepare(){
    if(context||disposed)return
    const Audio=window.AudioContext||window.webkitAudioContext
    if(!Audio){muted=true;state();return}
    context=new Audio({latencyHint:'interactive'})
    master=context.createGain();master.gain.value=.42
    filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=2800;filter.Q.value=.35
    const compressor=context.createDynamicsCompressor();compressor.threshold.value=-22;compressor.knee.value=22;compressor.ratio.value=3
    const reverb=context.createConvolver(),wet=context.createGain();wet.gain.value=.29
    const tail=context.createBuffer(2,Math.floor(context.sampleRate*3.6),context.sampleRate)
    for(let channel=0;channel<2;channel++){const samples=tail.getChannelData(channel);for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*Math.exp(-i/context.sampleRate*2)*(1-i/samples.length)}
    analyser=context.createAnalyser();analyser.fftSize=512;meterSamples=new Float32Array(512)
    reverb.buffer=tail;filter.connect(master);filter.connect(reverb);reverb.connect(wet);wet.connect(master);master.connect(compressor);compressor.connect(analyser);analyser.connect(context.destination)
    context.addEventListener('statechange',state)
  }
  function note(midi,at,strength,pan=0,length=3.8){
    if(!context||context.state!=='running'||muted||disposed||voices.size>=24)return
    const voice=context.createGain(),panner=context.createStereoPanner()
    voice.gain.setValueAtTime(.0001,at);voice.gain.exponentialRampToValueAtTime(Math.max(.001,strength),at+.025);voice.gain.exponentialRampToValueAtTime(.0001,at+length)
    panner.pan.value=Math.max(-.7,Math.min(.7,pan));voice.connect(panner);panner.connect(filter)
    const oscillators=[1,2.001,3.998].map((ratio,i)=>{const oscillator=context.createOscillator(),harmonic=context.createGain();oscillator.type='sine';oscillator.frequency.value=frequency(midi)*ratio;harmonic.gain.value=[1,.15,.028][i];oscillator.connect(harmonic);harmonic.connect(voice);oscillator.start(at);oscillator.stop(at+length+.05);return{oscillator,harmonic}})
    const entry={voice,panner,oscillators};voices.add(entry)
    oscillators[0].oscillator.onended=()=>{oscillators.forEach(({oscillator,harmonic})=>{oscillator.disconnect();harmonic.disconnect()});voice.disconnect();panner.disconnect();voices.delete(entry)}
  }
  function ambient(){
    clearTimeout(timer);timer=undefined
    if(disposed||muted||hidden||paused||context?.state!=='running')return
    const at=context.currentTime+.08,index=MOTIF[step++%MOTIF.length]
    note(SCALE[index]-12,at,.045,Math.sin(step*.7)*.3,5.5);note(SCALE[index+3],at+1.15,.021,-.2,4.5)
    timer=setTimeout(ambient,4400)
  }
  async function start(){
    prepare();if(!context||disposed||muted||hidden||paused){state();return false}
    try{await context.resume();if(disposed)return false;if(muted||hidden||paused){context.suspend().catch(()=>{});state();return false}state();if(!timer)ambient();if(!meterTimer)meter();return context.state==='running'}catch{muted=true;state();return false}
  }
  async function touch(x,y,strength=1){
    // Called from an actual pointer/key gesture so browser audio can unlock.
    if(!await start())return
    const now=context.currentTime;if(now-lastTouch<.18)return;lastTouch=now
    const index=Math.min(SCALE.length-1,Math.floor(x*SCALE.length)),pan=(x-.5)*1.3
    note(SCALE[index],now+.01,.09*Math.min(1,strength),pan);note(SCALE[Math.min(SCALE.length-1,index+2)],now+.32,.031*strength,-pan,4.2)
    if(y>.55)note(SCALE[index]-12,now+.07,.037*strength,pan,4.8)
  }
  function settle(){
    clearTimeout(timer);timer=undefined;clearTimeout(meterTimer);meterTimer=undefined
    if(!context||disposed)return
    master.gain.cancelScheduledValues(context.currentTime)
    if(muted||hidden||paused){master.gain.setTargetAtTime(0,context.currentTime,.06);context.suspend().catch(()=>{})}
    else{master.gain.setTargetAtTime(.42,context.currentTime,.12);start()}
    state()
  }
  function visibility(){hidden=document.hidden;settle()}
  document.addEventListener('visibilitychange',visibility);state()
  return{
    touch,
    enable(){muted=false;settle();return start()},
    async toggle(){if(!context){muted=false;await start();return}muted=!muted;if(!muted)await start();settle()},
    pause(value){paused=value;settle()},
    dispose(){disposed=true;clearTimeout(timer);clearTimeout(meterTimer);document.removeEventListener('visibilitychange',visibility);if(context){context.removeEventListener('statechange',state);voices.forEach(({oscillators})=>oscillators.forEach(({oscillator})=>{try{oscillator.stop()}catch{}}));context.close().catch(()=>{})}state()},
  }
}
