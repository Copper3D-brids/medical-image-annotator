"""
    根据@tool_config.json 帮我在@main.py 写一个app.post('/tool-config') api， 要求 model需要写在@model.py 文件中， 传入的数据是@tool_config.json 格式的数据， 当接受到数据后：
    1.写一个tool 函数 验证收到的数据是否与minio中的dataset数据一致 (如有需要可创建一个MinIO class 在一个文件夹中)
    1.1 验证minio public path是否存在，不存在抛出异常
    1.2 验证 所提供的assay中的datasets是否都存在于minio中，不存在抛出异常
    1.3 验证 所提供的cohorts名字是否都存在于所提供的所有datasets中subjects.xlsx文件的subject id中 （需要写一个读取xlsx文件的操作，pandas？），不存在抛出异常
    1.4 判断 @setup.py 中的INPUTS是否在所提供的datasets的samples.xlsx 的sample type中找到， 允许inputs并不用存在于每个dataset中，但是要在所有的datasets中找齐全部的chorts的inputs
    当所有条件满足,开始创建数据库的table，
    cohort的名字就是case的名字， 也是dataset中的subject id
    然后根据所提供的inputs和所有datasets中的samples.xlsx 找到对应的subjet_id 和sample_id, samples.xlsx会有subjet_id 和sample_id列， 
    然后根据找到的subjet_id 和sample_id到该dataset的manifest.xlsx的filename列匹配同时存在的value，这个value是唯一的而且是该input的在这个dataset下的路径，
    然后根据这个路径在拼接上minio public path/{当前的dataset name}/找到的input路径，然后更新到case_inputs表中
    """