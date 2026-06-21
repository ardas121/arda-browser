(function () {
  const translations = {
    tr: {
      newTab: "Yeni Sekme", loading: "Yükleniyor…", privateTab: "Yeni gizli sekme",
      bookmarks: "Yer imleri", history: "Geçmiş", downloads: "İndirilenler", findPage: "Sayfada bul",
      settings: "Ayarlar", back: "Geri", forward: "İleri", reload: "Yenile", home: "Ana sayfa",
      addressPlaceholder: "Ara veya adres gir", shieldsTitle: "Reklam ve izleyici engelleyici",
      addBookmark: "Yer imine ekle", menu: "Menü", historyEmpty: "Geçmiş boş.",
      clearHistory: "Geçmişi temizle", bookmarksEmpty: "Henüz yer imi yok.", downloadsEmpty: "İndirme yok.",
      searchEngine: "Arama motoru", shieldsSetting: "Reklam/izleyici engelleme",
      blockedTotal: "Engellenen toplam istek", enabled: "Açık", disabled: "Kapalı", language: "Dil",
      privacyTagline: "GİZLİLİĞİN KORUNDUĞU TARAYICI", duckSearch: "DuckDuckGo ile ara veya adres gir",
      search: "Ara", shieldFoot: "Reklam ve izleyici engelleme açık"
    },
    en: {
      newTab: "New Tab", loading: "Loading…", privateTab: "New private tab",
      bookmarks: "Bookmarks", history: "History", downloads: "Downloads", findPage: "Find in page",
      settings: "Settings", back: "Back", forward: "Forward", reload: "Reload", home: "Home",
      addressPlaceholder: "Search or enter address", shieldsTitle: "Ad and tracker blocker",
      addBookmark: "Add bookmark", menu: "Menu", historyEmpty: "History is empty.",
      clearHistory: "Clear history", bookmarksEmpty: "No bookmarks yet.", downloadsEmpty: "No downloads.",
      searchEngine: "Search engine", shieldsSetting: "Ad/tracker blocking",
      blockedTotal: "Total blocked requests", enabled: "On", disabled: "Off", language: "Language",
      privacyTagline: "THE BROWSER THAT PROTECTS YOUR PRIVACY", duckSearch: "Search with DuckDuckGo or enter address",
      search: "Search", shieldFoot: "Ad and tracker blocking is on"
    },
    de: {
      newTab: "Neuer Tab", loading: "Wird geladen…", privateTab: "Neuer privater Tab",
      bookmarks: "Lesezeichen", history: "Verlauf", downloads: "Downloads", findPage: "Auf Seite suchen",
      settings: "Einstellungen", back: "Zurück", forward: "Vor", reload: "Neu laden", home: "Startseite",
      addressPlaceholder: "Suchen oder Adresse eingeben", shieldsTitle: "Werbe- und Trackerblocker",
      addBookmark: "Lesezeichen hinzufügen", menu: "Menü", historyEmpty: "Der Verlauf ist leer.",
      clearHistory: "Verlauf löschen", bookmarksEmpty: "Noch keine Lesezeichen.", downloadsEmpty: "Keine Downloads.",
      searchEngine: "Suchmaschine", shieldsSetting: "Werbung/Tracker blockieren",
      blockedTotal: "Blockierte Anfragen", enabled: "Ein", disabled: "Aus", language: "Sprache",
      privacyTagline: "DER BROWSER, DER DEINE PRIVATSPHÄRE SCHÜTZT", duckSearch: "Mit DuckDuckGo suchen oder Adresse eingeben",
      search: "Suchen", shieldFoot: "Werbe- und Trackerblockierung ist aktiv"
    },
    fr: {
      newTab: "Nouvel onglet", loading: "Chargement…", privateTab: "Nouvel onglet privé",
      bookmarks: "Favoris", history: "Historique", downloads: "Téléchargements", findPage: "Rechercher dans la page",
      settings: "Paramètres", back: "Retour", forward: "Suivant", reload: "Actualiser", home: "Accueil",
      addressPlaceholder: "Rechercher ou saisir une adresse", shieldsTitle: "Bloqueur de publicités et traqueurs",
      addBookmark: "Ajouter aux favoris", menu: "Menu", historyEmpty: "L'historique est vide.",
      clearHistory: "Effacer l'historique", bookmarksEmpty: "Aucun favori.", downloadsEmpty: "Aucun téléchargement.",
      searchEngine: "Moteur de recherche", shieldsSetting: "Blocage des publicités/traqueurs",
      blockedTotal: "Requêtes bloquées", enabled: "Activé", disabled: "Désactivé", language: "Langue",
      privacyTagline: "LE NAVIGATEUR QUI PROTÈGE VOTRE VIE PRIVÉE", duckSearch: "Rechercher avec DuckDuckGo ou saisir une adresse",
      search: "Rechercher", shieldFoot: "Le blocage des publicités et traqueurs est actif"
    },
    es: {
      newTab: "Nueva pestaña", loading: "Cargando…", privateTab: "Nueva pestaña privada",
      bookmarks: "Marcadores", history: "Historial", downloads: "Descargas", findPage: "Buscar en la página",
      settings: "Ajustes", back: "Atrás", forward: "Adelante", reload: "Recargar", home: "Inicio",
      addressPlaceholder: "Buscar o escribir una dirección", shieldsTitle: "Bloqueador de anuncios y rastreadores",
      addBookmark: "Añadir marcador", menu: "Menú", historyEmpty: "El historial está vacío.",
      clearHistory: "Borrar historial", bookmarksEmpty: "Aún no hay marcadores.", downloadsEmpty: "No hay descargas.",
      searchEngine: "Motor de búsqueda", shieldsSetting: "Bloqueo de anuncios/rastreadores",
      blockedTotal: "Solicitudes bloqueadas", enabled: "Activado", disabled: "Desactivado", language: "Idioma",
      privacyTagline: "EL NAVEGADOR QUE PROTEGE TU PRIVACIDAD", duckSearch: "Buscar con DuckDuckGo o escribir una dirección",
      search: "Buscar", shieldFoot: "El bloqueo de anuncios y rastreadores está activo"
    },
    pt: {
      newTab: "Nova guia", loading: "Carregando…", privateTab: "Nova guia privada",
      bookmarks: "Favoritos", history: "Histórico", downloads: "Downloads", findPage: "Localizar na página",
      settings: "Configurações", back: "Voltar", forward: "Avançar", reload: "Recarregar", home: "Início",
      addressPlaceholder: "Pesquisar ou digitar endereço", shieldsTitle: "Bloqueador de anúncios e rastreadores",
      addBookmark: "Adicionar favorito", menu: "Menu", historyEmpty: "O histórico está vazio.",
      clearHistory: "Limpar histórico", bookmarksEmpty: "Ainda não há favoritos.", downloadsEmpty: "Nenhum download.",
      searchEngine: "Mecanismo de pesquisa", shieldsSetting: "Bloqueio de anúncios/rastreadores",
      blockedTotal: "Solicitações bloqueadas", enabled: "Ativado", disabled: "Desativado", language: "Idioma",
      privacyTagline: "O NAVEGADOR QUE PROTEGE SUA PRIVACIDADE", duckSearch: "Pesquisar com DuckDuckGo ou digitar endereço",
      search: "Pesquisar", shieldFoot: "Bloqueio de anúncios e rastreadores ativado"
    },
    ru: {
      newTab: "Новая вкладка", loading: "Загрузка…", privateTab: "Новая приватная вкладка",
      bookmarks: "Закладки", history: "История", downloads: "Загрузки", findPage: "Найти на странице",
      settings: "Настройки", back: "Назад", forward: "Вперёд", reload: "Обновить", home: "Главная",
      addressPlaceholder: "Поиск или адрес", shieldsTitle: "Блокировка рекламы и трекеров",
      addBookmark: "Добавить закладку", menu: "Меню", historyEmpty: "История пуста.",
      clearHistory: "Очистить историю", bookmarksEmpty: "Закладок пока нет.", downloadsEmpty: "Загрузок нет.",
      searchEngine: "Поисковая система", shieldsSetting: "Блокировка рекламы/трекеров",
      blockedTotal: "Заблокировано запросов", enabled: "Вкл.", disabled: "Выкл.", language: "Язык",
      privacyTagline: "БРАУЗЕР, КОТОРЫЙ ЗАЩИЩАЕТ ВАШУ КОНФИДЕНЦИАЛЬНОСТЬ", duckSearch: "Поиск DuckDuckGo или введите адрес",
      search: "Поиск", shieldFoot: "Блокировка рекламы и трекеров включена"
    },
    ar: {
      newTab: "علامة تبويب جديدة", loading: "جارٍ التحميل…", privateTab: "علامة تبويب خاصة جديدة",
      bookmarks: "الإشارات المرجعية", history: "السجل", downloads: "التنزيلات", findPage: "بحث في الصفحة",
      settings: "الإعدادات", back: "رجوع", forward: "تقدم", reload: "إعادة تحميل", home: "الرئيسية",
      addressPlaceholder: "ابحث أو أدخل عنوانًا", shieldsTitle: "حظر الإعلانات وأدوات التتبع",
      addBookmark: "إضافة إشارة مرجعية", menu: "القائمة", historyEmpty: "السجل فارغ.",
      clearHistory: "مسح السجل", bookmarksEmpty: "لا توجد إشارات مرجعية.", downloadsEmpty: "لا توجد تنزيلات.",
      searchEngine: "محرك البحث", shieldsSetting: "حظر الإعلانات/التتبع",
      blockedTotal: "إجمالي الطلبات المحظورة", enabled: "تشغيل", disabled: "إيقاف", language: "اللغة",
      privacyTagline: "المتصفح الذي يحمي خصوصيتك", duckSearch: "ابحث باستخدام DuckDuckGo أو أدخل عنوانًا",
      search: "بحث", shieldFoot: "حظر الإعلانات وأدوات التتبع مفعّل"
    },
    zh: {
      newTab: "新标签页", loading: "正在加载…", privateTab: "新建隐私标签页",
      bookmarks: "书签", history: "历史记录", downloads: "下载", findPage: "在页面中查找",
      settings: "设置", back: "后退", forward: "前进", reload: "重新加载", home: "主页",
      addressPlaceholder: "搜索或输入网址", shieldsTitle: "广告和跟踪器拦截",
      addBookmark: "添加书签", menu: "菜单", historyEmpty: "历史记录为空。",
      clearHistory: "清除历史记录", bookmarksEmpty: "暂无书签。", downloadsEmpty: "暂无下载。",
      searchEngine: "搜索引擎", shieldsSetting: "广告/跟踪器拦截",
      blockedTotal: "已拦截请求", enabled: "开启", disabled: "关闭", language: "语言",
      privacyTagline: "保护您隐私的浏览器", duckSearch: "使用 DuckDuckGo 搜索或输入网址",
      search: "搜索", shieldFoot: "广告和跟踪器拦截已开启"
    },
    ja: {
      newTab: "新しいタブ", loading: "読み込み中…", privateTab: "新しいプライベートタブ",
      bookmarks: "ブックマーク", history: "履歴", downloads: "ダウンロード", findPage: "ページ内検索",
      settings: "設定", back: "戻る", forward: "進む", reload: "再読み込み", home: "ホーム",
      addressPlaceholder: "検索またはアドレスを入力", shieldsTitle: "広告・トラッカーブロック",
      addBookmark: "ブックマークに追加", menu: "メニュー", historyEmpty: "履歴は空です。",
      clearHistory: "履歴を消去", bookmarksEmpty: "ブックマークはありません。", downloadsEmpty: "ダウンロードはありません。",
      searchEngine: "検索エンジン", shieldsSetting: "広告・トラッカーのブロック",
      blockedTotal: "ブロックしたリクエスト", enabled: "オン", disabled: "オフ", language: "言語",
      privacyTagline: "プライバシーを守るブラウザ", duckSearch: "DuckDuckGoで検索またはアドレスを入力",
      search: "検索", shieldFoot: "広告・トラッカーブロックはオンです"
    },
    ko: {
      newTab: "새 탭", loading: "로드 중…", privateTab: "새 비공개 탭",
      bookmarks: "북마크", history: "기록", downloads: "다운로드", findPage: "페이지에서 찾기",
      settings: "설정", back: "뒤로", forward: "앞으로", reload: "새로고침", home: "홈",
      addressPlaceholder: "검색어 또는 주소 입력", shieldsTitle: "광고 및 추적기 차단",
      addBookmark: "북마크 추가", menu: "메뉴", historyEmpty: "기록이 비어 있습니다.",
      clearHistory: "기록 삭제", bookmarksEmpty: "북마크가 없습니다.", downloadsEmpty: "다운로드가 없습니다.",
      searchEngine: "검색 엔진", shieldsSetting: "광고/추적기 차단",
      blockedTotal: "차단된 요청", enabled: "켜짐", disabled: "꺼짐", language: "언어",
      privacyTagline: "개인정보를 보호하는 브라우저", duckSearch: "DuckDuckGo로 검색하거나 주소 입력",
      search: "검색", shieldFoot: "광고 및 추적기 차단이 켜져 있습니다"
    },
    hi: {
      newTab: "नया टैब", loading: "लोड हो रहा है…", privateTab: "नया निजी टैब",
      bookmarks: "बुकमार्क", history: "इतिहास", downloads: "डाउनलोड", findPage: "पेज में खोजें",
      settings: "सेटिंग्स", back: "पीछे", forward: "आगे", reload: "रीलोड", home: "होम",
      addressPlaceholder: "खोजें या पता दर्ज करें", shieldsTitle: "विज्ञापन और ट्रैकर अवरोधक",
      addBookmark: "बुकमार्क जोड़ें", menu: "मेनू", historyEmpty: "इतिहास खाली है।",
      clearHistory: "इतिहास साफ़ करें", bookmarksEmpty: "अभी कोई बुकमार्क नहीं।", downloadsEmpty: "कोई डाउनलोड नहीं।",
      searchEngine: "खोज इंजन", shieldsSetting: "विज्ञापन/ट्रैकर अवरोधन",
      blockedTotal: "कुल अवरुद्ध अनुरोध", enabled: "चालू", disabled: "बंद", language: "भाषा",
      privacyTagline: "आपकी गोपनीयता की रक्षा करने वाला ब्राउज़र", duckSearch: "DuckDuckGo से खोजें या पता दर्ज करें",
      search: "खोजें", shieldFoot: "विज्ञापन और ट्रैकर अवरोधन चालू है"
    }
  };

  window.ARDA_I18N = {
    translations,
    supported: Object.keys(translations),
    get(code, key) {
      return translations[code]?.[key] || translations.en[key] || key;
    }
  };
})();
