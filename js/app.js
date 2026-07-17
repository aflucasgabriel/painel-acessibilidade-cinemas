Promise.all([
    d3.json("data/brasil_uf.json"),
    d3.json("data/ancine_agg_uf.json"),
    d3.json("data/ancine_salas.json"),
    d3.json("data/ancine_agg_complexo.json")
]).then(function(files) {
    
    const geoData = files[0][0];
    const dadosUF = files[1];
    const dadosSalas = files[2];
    const dadosComplexo = files[3];

    const ufLookup = d3.index(dadosUF, d => d.UF_COMPLEXO);

    const tooltip = d3.select("body").append("div").attr("class", "tooltip");

    inicializarMapa(geoData, ufLookup, tooltip);
    inicializarBeeswarm(dadosComplexo, tooltip);



}).catch(function(erro) {
    console.error("Erro ao carregar os arquivos JSON:", erro);
});