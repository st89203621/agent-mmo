"""单图烟雾测试：只生成 #01 樱花暮春，验证 workflow 通顺"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from generate import generate_one, STYLES
label, prompt = STYLES[0]
generate_one(label, prompt)
