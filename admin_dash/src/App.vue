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
@use "@/styles/variables.scss" as *;

/* Global Styles */
body {
  font-family: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei',
               $font-family-body, -apple-system, sans-serif;
  background-color: $bg-content;
  color: $text-primary;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1, h2, h3, h4, h5, h6 {
  font-family: 'Playfair Display', 'PingFang SC', serif;
  font-weight: 700;
  color: $color-obsidian-black;
  letter-spacing: 0.5px;
}

.mono {
  font-family: $font-family-mono;
}

/* Custom Scrollbar for Web */
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
::-webkit-scrollbar-track {
  background: rgba($color-deep-brown, 0.05);
}
::-webkit-scrollbar-thumb {
  background: $color-amber-gold;
  border-radius: 5px;
  border: 2px solid $bg-content;
}
::-webkit-scrollbar-thumb:hover {
  background: $color-amber-dark;
}
</style>
