<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
onLaunch(() => {
  console.log("App Launch");
});
onShow(() => {
  console.log("App Show");
});
onHide(() => {
  console.log("App Hide");
});
</script>

<style lang="scss">
@import "@/styles/variables.scss";

/* Global Styles */
body {
  font-family: $font-family-body;
  background-color: $bg-content;
  color: $text-primary;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4, h5, h6 {
  font-family: $font-family-heading;
  font-weight: 700;
  color: $color-obsidian-black;
}

.mono {
  font-family: $font-family-mono;
}

/* Custom Scrollbar for Web */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: #f1f1f1; 
}
::-webkit-scrollbar-thumb {
  background: #ccc; 
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #999; 
}
</style>
