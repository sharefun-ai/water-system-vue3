<script setup>
defineProps({name:String,size:{type:Number,default:20}})
const paths={
  calendar:'M4 5h16v16H4V5Z M8 3v4 M16 3v4 M4 10h16',
  waves:'M2 7c3-4 5 4 10 0s7 4 10 0 M2 12c3-4 5 4 10 0s7 4 10 0 M2 17c3-4 5 4 10 0s7 4 10 0',
  arrow:'M5 12h14 M13 6l6 6-6 6',
  info:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M12 11v6 M12 7h.01',
  drop:'M12 3C9 7 5 10 5 14a7 7 0 0 0 14 0c0-4-4-7-7-11Z M8 14a4 4 0 0 0 4 4',
  cube:'m12 3 9 5v8l-9 5-9-5V8l9-5Z M3 8l9 5 9-5 M12 13v8 M7.5 5.5l9 5',
  chart:'M4 4v16h16 M7 15l4-5 4 3 5-7',
  alarm:'M12 3 2 20h20L12 3Z M12 9v5 M12 17h.01',
  report:'M6 3h9l4 4v14H6V3Z M15 3v5h4 M9 12h7 M9 16h7',
  layers:'m12 3 10 6-10 6L2 9l10-6Z M2 13l10 6 10-6 M2 17l10 6 10-6',
  target:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z M12 2v4 M12 18v4 M2 12h4 M18 12h4',
  plus:'M12 5v14 M5 12h14',minus:'M5 12h14',
  reset:'M3 10a9 9 0 1 1 2 9 M3 4v6h6',
  expand:'M8 3H3v5 M16 3h5v5 M3 16v5h5 M21 16v5h-5',
  pause:'M8 5v14 M16 5v14',play:'m8 4 12 8-12 8V4Z',
  settings:'M4 7h16 M4 17h16 M8 4v6 M16 14v6',
  download:'M12 3v12 m-5-5 5 5 5-5 M4 17v4h16v-4',
  close:'m6 6 12 12 M18 6 6 18',chevron:'m9 5 7 7-7 7',
  flow:'M3 8h16m-4-4 4 4-4 4 M21 16H5m4-4-4 4 4 4',
  check:'m5 12 4 4L19 6',search:'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z m5 12 6 6',
  camera:'M4 7h4l2-3h4l2 3h4v13H4V7Z M12 10a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  pressure:'M4 18a9 9 0 1 1 16 0 M12 13l4-5 M12 13h.01',
  eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
}
</script>
<template><svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="paths[name]||paths.cube"/></svg></template>
