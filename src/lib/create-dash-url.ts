function createDashURL(dashID: string, params: { [key: string]: string }) {
  const url = `https://admin.tago.io/dashboards/info/${dashID}`;
  const paramsURL = new URLSearchParams(params).toString();
  if (paramsURL.length === 0) {
    return `${url}`;
  }
  return `${url}?${paramsURL}`;
}

export { createDashURL };
