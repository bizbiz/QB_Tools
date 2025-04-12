// app/static/js/components/IconSelector.js
const IconSelector = (props) => {
  const { collections = [], onSelect = () => {} } = props;
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCollection, setSelectedCollection] = React.useState('');
  const [icons, setIcons] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedIcon, setSelectedIcon] = React.useState(null);
  const [language, setLanguage] = React.useState('en');
  
  const availableLanguages = [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' }
  ];
  
  // Rechercher des icônes avec un délai pour éviter trop de requêtes
  const searchIcons = React.useCallback(
    React.debounce((query, collection, lang) => {
      if (!query || query.length < 2) return;
      
      setLoading(true);
      
      // Construire l'URL avec paramètres de langue
      let apiUrl = `https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=48&lang=${lang}`;
      if (collection) {
        apiUrl += `&collections=${collection}`;
      }
      
      fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
          setIcons(data.icons || []);
          setLoading(false);
        })
        .catch(error => {
          console.error('Error searching icons:', error);
          setLoading(false);
        });
    }, 300),
    []
  );
  
  // Effectuer la recherche quand les paramètres changent
  React.useEffect(() => {
    if (searchQuery.length >= 2) {
      searchIcons(searchQuery, selectedCollection, language);
    } else {
      setIcons([]);
    }
  }, [searchQuery, selectedCollection, language]);
  
  // Gérer la sélection d'icône
  const handleIconSelect = (icon) => {
    setSelectedIcon(icon);
    onSelect(icon);
  };
  
  return (
    <div className="icon-selector">
      <div className="mb-3">
        <div className="row">
          <div className="col-md-6">
            <div className="input-group">
              <span className="input-group-text"><i className="fas fa-search"></i></span>
              <input
                type="text"
                className="form-control"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher des icônes..."
              />
            </div>
          </div>
          <div className="col-md-3">
            <select 
              className="form-select" 
              value={selectedCollection}
              onChange={(e) => setSelectedCollection(e.target.value)}
            >
              <option value="">Toutes les collections</option>
              {collections.map(collection => (
                <option key={collection} value={collection}>{collection}</option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <select 
              className="form-select" 
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {availableLanguages.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      <div className="icons-container">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Chargement...</span>
            </div>
            <p className="mt-2">Recherche d'icônes...</p>
          </div>
        ) : searchQuery.length < 2 ? (
          <div className="alert alert-info">
            Entrez au moins 2 caractères pour rechercher des icônes.
          </div>
        ) : icons.length === 0 ? (
          <div className="alert alert-warning">
            Aucune icône trouvée. Essayez d'autres termes ou une autre langue.
          </div>
        ) : (
          <div className="row g-2">
            {icons.map(icon => (
              <div className="col-4 col-md-3 col-lg-2" key={icon}>
                <div 
                  className={`icon-item p-2 text-center ${selectedIcon === icon ? 'selected' : ''}`}
                  onClick={() => handleIconSelect(icon)}
                >
                  <span className="iconify mb-2" data-icon={icon} style={{ fontSize: '24px' }}></span>
                  <div className="small text-truncate">{icon.split(':')[1]}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {selectedIcon && (
        <div className="mt-3 p-3 border rounded selected-icon-container">
          <div className="d-flex align-items-center">
            <div className="me-3">
              <span className="iconify" data-icon={selectedIcon} style={{ fontSize: '48px' }}></span>
            </div>
            <div>
              <h5 className="mb-1">Icône sélectionnée</h5>
              <code>{selectedIcon}</code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Fonction debounce pour limiter les appels à l'API
React.debounce = (func, delay) => {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
};