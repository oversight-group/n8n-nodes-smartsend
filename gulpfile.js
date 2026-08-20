const { task, src, dest } = require('gulp');

task('build:icons', copyIcons);

function copyIcons() {
	return src('nodes/**/*.{png,svg}').pipe(dest('dist/nodes'));
}
