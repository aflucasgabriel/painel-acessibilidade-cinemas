import pandas as pd
import numpy as np
import json

def pre_processar_ancine(file_path):
    print("Carregando o arquivo...")
    df = pd.read_csv(file_path, encoding='latin1', sep=';')

    # 1. Calcular Proporções
    df['prop_cad'] = (df['ASSENTOS_CADEIRANTES'] / df['ASSENTOS_SALA']).replace([np.inf, -np.inf], 0).fillna(0)
    df['prop_mob'] = (df['ASSENTOS_MOBILIDADE_REDUZIDA'] / df['ASSENTOS_SALA']).replace([np.inf, -np.inf], 0).fillna(0)
    df['prop_obe'] = (df['ASSENTOS_OBESIDADE'] / df['ASSENTOS_SALA']).replace([np.inf, -np.inf], 0).fillna(0)

    # 2. Normalização Global (Min-Max) com Clipping (Percentil 99)
    for col in ['prop_cad', 'prop_mob', 'prop_obe']:
        p99 = df[col].quantile(0.99)
        if p99 == 0: 
            p99 = df[col].max()
            
        clipped = df[col].clip(upper=p99)
        col_min, col_max = clipped.min(), clipped.max()
        
        norm_col = col.replace('prop_', 'norm_')
        if col_max - col_min == 0:
            df[norm_col] = 0
        else:
            df[norm_col] = (clipped - col_min) / (col_max - col_min)

    # 3. Calcular Scores
    df['rampa_assentos'] = (df['ACESSO_ASSENTOS_COM_RAMPA'] == 'SIM').astype(int)
    df['rampa_sala'] = (df['ACESSO_SALA_COM_RAMPA'] == 'SIM').astype(int)
    df['banheiro'] = (df['BANHEIROS_ACESSIVEIS'] == 'SIM').astype(int)

    df['score_infra'] = (df['rampa_assentos'] + df['rampa_sala'] + df['banheiro']) / 3
    df['score_capacidade'] = (df['norm_cad'] + df['norm_mob'] + df['norm_obe']) / 3

    # 4. Agregações (UF e Exibidor)
    agg_uf = df.groupby('UF_COMPLEXO').agg(
        qtd_salas=('ASSENTOS_SALA', 'count'),
        total_assentos=('ASSENTOS_SALA', 'sum'),
        score_infra_medio=('score_infra', 'mean'),
        score_capacidade_medio=('score_capacidade', 'mean')
    ).round(4).reset_index().to_dict(orient='records')

    agg_exibidor = df.groupby('NOME_EXIBIDOR').agg(
        qtd_salas=('ASSENTOS_SALA', 'count'),
        total_assentos=('ASSENTOS_SALA', 'sum'),
        score_infra_medio=('score_infra', 'mean'),
        score_capacidade_medio=('score_capacidade', 'mean')
    ).round(4).reset_index().to_dict(orient='records')

    # AJUSTE 1: Agregação Complexo (Usando Nome, Município e UF)
    # Criando o ID único para facilitar a junção (join) no D3 e evitar bugs de homônimos
    df['ID_COMPLEXO'] = df['NOME_COMPLEXO'] + " - " + df['MUNICIPIO_COMPLEXO'] + " (" + df['UF_COMPLEXO'] + ")"
    
    agg_complexo = df.groupby(['ID_COMPLEXO', 'NOME_COMPLEXO', 'MUNICIPIO_COMPLEXO', 'UF_COMPLEXO']).agg(
        qtd_salas=('ASSENTOS_SALA', 'count'),
        total_assentos=('ASSENTOS_SALA', 'sum'),
        score_infra_medio=('score_infra', 'mean'),
        score_capacidade_medio=('score_capacidade', 'mean')
    ).round(4).reset_index().to_dict(orient='records')

    # 5. Preparar Contagens pro Funil
    combinacoes = df.groupby(['banheiro', 'rampa_sala', 'rampa_assentos']).size().reset_index(name='count')
    combinacoes = combinacoes.astype(int).to_dict(orient='records')

    funil_data = {
        "total_salas": int(len(df)),
        "step_banheiro_acessivel": int(df['banheiro'].sum()),
        "step_rampa_sala": int(df['rampa_sala'].sum()),
        "step_rampa_assentos": int(df['rampa_assentos'].sum()),
        "todas_combinacoes": combinacoes
    }

    # AJUSTE 2: Export a nível de sala (para o Beeswarm)
    # Selecionar apenas o estritamente necessário para manter o JSON leve
    df_salas = df[[
        'ID_COMPLEXO', 
        'UF_COMPLEXO', 
        'NOME_EXIBIDOR', 
        'ASSENTOS_SALA', 
        'score_infra', 
        'score_capacidade', 
        'banheiro', 
        'rampa_sala', 
        'rampa_assentos'
    ]].copy()
    
    # Arredondando os scores para aliviar ainda mais o peso final do JSON no client-side
    df_salas['score_infra'] = df_salas['score_infra'].round(4)
    df_salas['score_capacidade'] = df_salas['score_capacidade'].round(4)
    
    salas_data = df_salas.to_dict(orient='records')

    # 6. Exportar tudo
    exportacoes = {
        "ancine_agg_uf.json": agg_uf,
        "ancine_agg_exibidor.json": agg_exibidor,
        "ancine_agg_complexo.json": agg_complexo,
        "ancine_funil.json": funil_data,
        "ancine_salas.json": salas_data  # <--- Novo export
    }

    for nome_arquivo, dados in exportacoes.items():
        with open(nome_arquivo, 'w', encoding='utf-8') as f:
            json.dump(dados, f, ensure_ascii=False, indent=2)
            
    print("Processamento concluído. 5 arquivos JSON gerados com sucesso!")

# Chamada de execução (aponte para o arquivo na mesma pasta que o script)
arquivo = "ancine1_xml(ancine1_xml_trusted) (1).csv"
pre_processar_ancine(arquivo)