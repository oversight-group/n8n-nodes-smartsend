const { task, src, dest } = require('gulp');

task('build:icons', copyAssets);

// Icons and the node codex (SmartSend.node.json) are not emitted by tsc, so
// they are copied into dist alongside the compiled node.
function copyAssets() {
	return src('nodes/**/*.{png,svg,json}').pipe(dest('dist/nodes'));
}
