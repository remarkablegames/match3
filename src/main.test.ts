it('renders without crashing', async () => {
  const querySelectorSpy = vi
    .spyOn(document, 'querySelector')
    .mockReturnValueOnce(document.createElement('div'))
    .mockReturnValueOnce(document.createElement('button'));

  await import('./main');

  expect(querySelectorSpy).toHaveBeenCalledTimes(2);
  expect(querySelectorSpy).toHaveBeenCalledWith('#app');
  expect(querySelectorSpy).toHaveBeenCalledWith('#counter');

  querySelectorSpy.mockRestore();
});
