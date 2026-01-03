/**
 * TVBox JAR 诊断可视化页面
 * 提供友好的 HTML 界面展示诊断结果
 */

export async function GET() {
  const html = `
<!DOCTYPE html>
<html lang="zh-CN" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TVBox JAR 源诊断工具</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        primary: '#6366f1',
                        secondary: '#a855f7',
                    }
                }
            }
        }
    </script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; }
        .glass {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .animate-spin-slow {
            animation: spin 3s linear infinite;
        }
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body class="bg-gray-900 text-gray-100 min-h-screen p-4 md:p-8 selection:bg-blue-500 selection:text-white">
    <div class="max-w-5xl mx-auto">
        <!-- Header -->
        <div class="text-center mb-10">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-4 shadow-lg shadow-blue-500/30">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <h1 class="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-3">
                TVBox JAR 源诊断工具
            </h1>
            <p class="text-gray-400 max-w-2xl mx-auto">深度测试 JAR 文件源的可用性和性能，自动分析网络环境并推荐最佳源</p>
        </div>

        <!-- Main Card -->
        <div class="bg-gray-800/50 rounded-2xl border border-gray-700 shadow-xl overflow-hidden backdrop-blur-sm">
            <div class="p-8 text-center border-b border-gray-700/50 bg-gray-800/30">
                <button id="startTest" class="group relative inline-flex items-center justify-center px-8 py-3.5 text-lg font-medium text-white transition-all duration-200 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full hover:from-blue-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-900 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:-translate-y-0.5 active:translate-y-0">
                    <span class="relative flex items-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        开始诊断测试
                    </span>
                </button>
            </div>
            
            <div id="result" class="p-6 md:p-8 min-h-[300px]">
                <div class="flex flex-col items-center justify-center h-full text-gray-500 py-12">
                    <div class="w-20 h-20 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center mb-4">
                        <svg class="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                    </div>
                    <p class="text-lg font-medium text-gray-400">点击上方按钮开始测试</p>
                    <p class="text-sm text-gray-600 mt-2">将测试多个源节点的连通性与速度</p>
                </div>
            </div>
        </div>
        
        <div class="mt-8 text-center text-sm text-gray-500">
            <p>Powered by DecoTV &copy; ${new Date().getFullYear()}</p>
        </div>
    </div>

    <script>
        const startBtn = document.getElementById('startTest');
        const resultDiv = document.getElementById('result');

        startBtn.addEventListener('click', async () => {
            startBtn.disabled = true;
            startBtn.innerHTML = \`
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                测试进行中...
            \`;
            startBtn.classList.add('opacity-75', 'cursor-not-allowed');

            resultDiv.innerHTML = \`
                <div class="flex flex-col items-center justify-center py-20">
                    <div class="relative w-24 h-24 mb-8">
                        <div class="absolute inset-0 rounded-full border-4 border-gray-700"></div>
                        <div class="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
                        <div class="absolute inset-4 rounded-full border-4 border-purple-500 border-b-transparent animate-spin-slow"></div>
                    </div>
                    <h3 class="text-xl font-semibold text-white mb-2">正在诊断网络环境</h3>
                    <p class="text-gray-400">正在并发测试所有 JAR 源节点，请稍候...</p>
                    <div class="mt-6 flex gap-2">
                        <span class="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style="animation-delay: 0s"></span>
                        <span class="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style="animation-delay: 0.2s"></span>
                        <span class="w-2 h-2 rounded-full bg-pink-500 animate-bounce" style="animation-delay: 0.4s"></span>
                    </div>
                </div>
            \`;

            try {
                const response = await fetch('/api/tvbox/jar-diagnostic');
                const data = await response.json();

                renderResults(data);
            } catch (error) {
                resultDiv.innerHTML = \`
                    <div class="bg-red-900/20 border border-red-800 rounded-xl p-6 text-center">
                        <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-900/50 text-red-400 mb-4">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <h3 class="text-lg font-semibold text-red-400 mb-2">诊断失败</h3>
                        <p class="text-red-300/80">\${error.message}</p>
                        <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded-lg text-sm transition-colors">刷新重试</button>
                    </div>
                \`;
            } finally {
                startBtn.disabled = false;
                startBtn.innerHTML = \`
                    <span class="relative flex items-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        重新测试
                    </span>
                \`;
                startBtn.classList.remove('opacity-75', 'cursor-not-allowed');
            }
        });

        function renderResults(data) {
            const { environment, summary, recommendations, jarTests } = data;

            let html = \`
                <div class="animate-fade-in">
                    <div class="flex items-center justify-between mb-6">
                        <h2 class="text-2xl font-bold text-white flex items-center gap-2">
                            <span class="text-green-400">📊</span> 诊断报告
                        </h2>
                        <span class="text-sm text-gray-500">\${new Date(data.timestamp).toLocaleString('zh-CN')}</span>
                    </div>

                    <!-- Environment Info -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div class="bg-gray-700/30 rounded-xl p-4 border border-gray-700">
                            <div class="text-sm text-gray-400 mb-1">网络环境</div>
                            <div class="text-lg font-semibold text-white flex items-center gap-2">
                                \${environment.isDomestic ? '<span class="text-2xl">🇨🇳</span> 国内网络' : '<span class="text-2xl">🌐</span> 海外网络'}
                            </div>
                        </div>
                        <div class="bg-gray-700/30 rounded-xl p-4 border border-gray-700">
                            <div class="text-sm text-gray-400 mb-1">系统时区</div>
                            <div class="text-lg font-semibold text-white">\${environment.timezone}</div>
                        </div>
                        <div class="bg-gray-700/30 rounded-xl p-4 border border-gray-700">
                            <div class="text-sm text-gray-400 mb-1">User Agent</div>
                            <div class="text-sm font-mono text-gray-300 truncate" title="\${environment.userAgent}">\${environment.userAgent.substring(0, 20)}...</div>
                        </div>
                    </div>

                    <!-- Summary Stats -->
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div class="bg-gray-700/50 rounded-xl p-5 text-center border border-gray-700">
                            <div class="text-3xl font-bold text-white mb-1">\${summary.totalTested}</div>
                            <div class="text-xs text-gray-400 uppercase tracking-wider">总测试源</div>
                        </div>
                        <div class="bg-green-900/20 rounded-xl p-5 text-center border border-green-900/30">
                            <div class="text-3xl font-bold text-green-400 mb-1">\${summary.successCount}</div>
                            <div class="text-xs text-green-400/70 uppercase tracking-wider">可用源</div>
                        </div>
                        <div class="bg-red-900/20 rounded-xl p-5 text-center border border-red-900/30">
                            <div class="text-3xl font-bold text-red-400 mb-1">\${summary.failedCount}</div>
                            <div class="text-xs text-red-400/70 uppercase tracking-wider">失败源</div>
                        </div>
                        <div class="bg-blue-900/20 rounded-xl p-5 text-center border border-blue-900/30">
                            <div class="text-3xl font-bold text-blue-400 mb-1">\${summary.averageResponseTime.toFixed(0)}<span class="text-sm ml-1">ms</span></div>
                            <div class="text-xs text-blue-400/70 uppercase tracking-wider">平均响应</div>
                        </div>
                    </div>

                    <!-- Recommendations -->
                    <div class="bg-yellow-900/10 border border-yellow-700/30 rounded-xl p-6 mb-8">
                        <h3 class="text-lg font-semibold text-yellow-400 mb-4 flex items-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                            诊断建议
                        </h3>
                        <ul class="space-y-2">
                            \${recommendations.map(rec => \`
                                <li class="flex items-start gap-2 text-yellow-200/80 text-sm">
                                    <span class="mt-1.5 w-1.5 h-1.5 rounded-full bg-yellow-500 flex-shrink-0"></span>
                                    <span>\${rec}</span>
                                </li>
                            \`).join('')}
                        </ul>
                    </div>

                    <!-- Detailed Results -->
                    <div>
                        <h3 class="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                            <span class="text-blue-400">📋</span> 详细测试结果
                        </h3>
                        <div class="space-y-3">
                            \${jarTests.map(test => renderTestItem(test)).join('')}
                        </div>
                    </div>
                </div>
            \`;

            resultDiv.innerHTML = html;
        }

        function renderTestItem(test) {
            const statusConfig = {
                'success': { text: '可用', bg: 'bg-green-500/10', border: 'border-green-500/20', textCol: 'text-green-400', icon: '✓' },
                'failed': { text: '失败', bg: 'bg-red-500/10', border: 'border-red-500/20', textCol: 'text-red-400', icon: '✗' },
                'timeout': { text: '超时', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', textCol: 'text-yellow-400', icon: '⏱' },
                'invalid': { text: '无效', bg: 'bg-gray-500/10', border: 'border-gray-500/20', textCol: 'text-gray-400', icon: '⚠️' }
            }[test.status];

            return \`
                <div class="group relative overflow-hidden rounded-xl border \${statusConfig.border} \${statusConfig.bg} p-4 transition-all hover:border-opacity-50 hover:shadow-lg">
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-1">
                                <span class="px-2 py-0.5 rounded text-xs font-bold \${statusConfig.bg.replace('/10', '/20')} \${statusConfig.textCol} border border-opacity-20 border-current">
                                    \${statusConfig.text}
                                </span>
                                <div class="text-sm font-mono text-gray-300 truncate" title="\${test.url}">\${test.url}</div>
                            </div>
                            <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                                \${test.httpStatus ? \`<span>HTTP: <span class="\${test.httpStatus === 200 ? 'text-green-400' : 'text-red-400'}">\${test.httpStatus}</span></span>\` : ''}
                                \${test.fileSize ? \`<span>Size: <span class="text-gray-300">\${(test.fileSize / 1024).toFixed(2)} KB</span></span>\` : ''}
                                \${test.md5 ? \`<span>MD5: <span class="font-mono text-gray-400">\${test.md5.substring(0, 8)}...</span></span>\` : ''}
                            </div>
                        </div>
                        
                        <div class="flex items-center gap-4 flex-shrink-0">
                            <div class="text-right">
                                <div class="text-lg font-bold \${test.responseTime < 1000 ? 'text-green-400' : test.responseTime < 3000 ? 'text-yellow-400' : 'text-red-400'}">
                                    \${test.responseTime}ms
                                </div>
                                <div class="text-xs text-gray-500">响应时间</div>
                            </div>
                        </div>
                    </div>
                    
                    \${test.error ? \`
                        <div class="mt-3 text-xs text-red-400 bg-red-900/20 p-2 rounded border border-red-900/30">
                            Error: \${test.error}
                        </div>
                    \` : ''}
                </div>
            \`;
        }
    </script>
</body>
</html>
  `;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}
