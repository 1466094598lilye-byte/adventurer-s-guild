import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Trash2, Loader2, CheckCircle, XCircle } from "lucide-react";

export default function AdminTestPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const testCleanFunction = async () => {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      console.log('🚀 开始调用 cleanOldProjects 函数...');
      
      const response = await base44.functions.invoke('cleanOldProjects');
      
      console.log('✅ 函数调用成功！');
      console.log('📦 返回数据:', response.data);
      
      setResult(response.data);
    } catch (err) {
      console.error('❌ 函数调用失败:', err);
      console.error('错误详情:', err.response?.data || err.message);
      
      setError(err.response?.data || { message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: '#F9FAFB' }}>
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div 
          className="mb-6 p-4 transform -rotate-1"
          style={{
            backgroundColor: '#000',
            color: '#FFE66D',
            border: '5px solid #FFE66D',
            boxShadow: '8px 8px 0px #FFE66D'
          }}
        >
          <h1 className="text-3xl font-black uppercase text-center">
            🧪 管理员测试面板 🧪
          </h1>
          <p className="text-center font-bold text-sm mt-2">
            测试清理旧项目函数
          </p>
        </div>

        {/* 测试按钮 */}
        <div 
          className="mb-6 p-6"
          style={{
            backgroundColor: '#FFF',
            border: '4px solid #000',
            boxShadow: '6px 6px 0px #000'
          }}
        >
          <button
            onClick={testCleanFunction}
            disabled={loading}
            className="w-full py-4 font-black uppercase text-lg flex items-center justify-center gap-3"
            style={{
              backgroundColor: loading ? '#E0E0E0' : '#FF6B35',
              color: '#FFF',
              border: '4px solid #000',
              boxShadow: '6px 6px 0px #000',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" strokeWidth={3} />
                执行中...
              </>
            ) : (
              <>
                <Trash2 className="w-6 h-6" strokeWidth={3} />
                运行清理函数
              </>
            )}
          </button>

          <div className="mt-4 p-3" style={{ backgroundColor: '#FFE66D', border: '3px solid #000' }}>
            <p className="text-xs font-bold">
              ⚠️ <strong>注意</strong>：此函数需要管理员权限才能执行
            </p>
            <p className="text-xs font-bold mt-2">
              📝 函数会计算2年前的日期，并返回详细的执行信息
            </p>
          </div>
        </div>

        {/* 成功结果展示 */}
        {result && (
          <div 
            className="mb-6 p-6"
            style={{
              backgroundColor: '#4ECDC4',
              border: '4px solid #000',
              boxShadow: '6px 6px 0px #000'
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-8 h-8" strokeWidth={3} />
              <h2 className="text-2xl font-black uppercase">执行成功！</h2>
            </div>

            <div 
              className="p-4 mb-4"
              style={{
                backgroundColor: '#FFF',
                border: '3px solid #000'
              }}
            >
              <pre className="text-xs font-bold whitespace-pre-wrap break-words">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div 
                className="p-3 text-center"
                style={{ backgroundColor: '#FFE66D', border: '3px solid #000' }}
              >
                <p className="text-xs font-bold uppercase mb-1">截止日期</p>
                <p className="text-lg font-black">{result.cutoffDate}</p>
              </div>
              
              <div 
                className="p-3 text-center"
                style={{ backgroundColor: '#FFE66D', border: '3px solid #000' }}
              >
                <p className="text-xs font-bold uppercase mb-1">执行时间</p>
                <p className="text-sm font-black">
                  {result.executedAt ? new Date(result.executedAt).toLocaleString('zh-CN') : '-'}
                </p>
              </div>
            </div>

            {result.stats && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div 
                  className="p-3 text-center"
                  style={{ backgroundColor: '#C44569', color: '#FFF', border: '3px solid #000' }}
                >
                  <p className="text-xs font-bold uppercase mb-1">删除的项目</p>
                  <p className="text-2xl font-black">{result.stats.projectsDeleted}</p>
                </div>
                
                <div 
                  className="p-3 text-center"
                  style={{ backgroundColor: '#C44569', color: '#FFF', border: '3px solid #000' }}
                >
                  <p className="text-xs font-bold uppercase mb-1">删除的任务</p>
                  <p className="text-2xl font-black">{result.stats.questsDeleted}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 错误结果展示 */}
        {error && (
          <div 
            className="mb-6 p-6"
            style={{
              backgroundColor: '#FF6B35',
              color: '#FFF',
              border: '4px solid #000',
              boxShadow: '6px 6px 0px #000'
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <XCircle className="w-8 h-8" strokeWidth={3} />
              <h2 className="text-2xl font-black uppercase">执行失败！</h2>
            </div>

            <div 
              className="p-4"
              style={{
                backgroundColor: 'rgba(0,0,0,0.2)',
                border: '3px solid #000'
              }}
            >
              <p className="font-black mb-2">错误信息：</p>
              <pre className="text-xs font-bold whitespace-pre-wrap break-words">
                {JSON.stringify(error, null, 2)}
              </pre>
            </div>

            {error.userRole && (
              <div className="mt-4 p-3" style={{ backgroundColor: 'rgba(0,0,0,0.2)', border: '3px solid #000' }}>
                <p className="text-sm font-bold">
                  ⚠️ 当前用户角色: <strong>{error.userRole}</strong>
                </p>
                <p className="text-xs font-bold mt-2">
                  需要 <strong>admin</strong> 角色才能执行此操作
                </p>
              </div>
            )}
          </div>
        )}

        {/* 使用说明 */}
        <div 
          className="p-6"
          style={{
            backgroundColor: '#FFE66D',
            border: '4px solid #000',
            boxShadow: '6px 6px 0px #000'
          }}
        >
          <h3 className="font-black uppercase mb-3">📚 使用说明</h3>
          <ul className="space-y-2 text-sm font-bold">
            <li>✅ 点击按钮后，函数会在后台执行</li>
            <li>✅ 查看浏览器 Console（F12）可以看到详细日志</li>
            <li>✅ 函数执行结果会显示在这个页面上</li>
            <li>✅ 后端日志可在 Dashboard → Code → Functions → cleanOldProjects 查看</li>
          </ul>
        </div>
      </div>
    </div>
  );
}