const esbuild = require('esbuild');

const isProduction = process.env.NODE_ENV === 'production';

const buildOptions = (entryPoint, outfile, globalName) => ({
    entryPoints: [entryPoint],
    bundle: true,
    minify: isProduction,
    sourcemap: !isProduction,
    globalName: globalName,
    outfile: outfile,
    external: ['jquery', 'bootstrap'],
    define: {
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development')
    },
});

// Main build
esbuild.build(buildOptions('src/edges.js', 'dist/bundle.js', 'edges')).catch(() => process.exit(1));

// Additional builds
esbuild.build(buildOptions('src/components/RefiningANDTermSelector.js', 'dist/components/RefiningANDTermSelector.bundle.js', '')).catch(() => process.exit(1));

