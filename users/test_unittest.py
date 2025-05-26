import unittest
from rest_framework.test import APIClient
from .models import User



class UserViewsTestCase(unittest.TestCase):
    def setUp(self):
        self.client = APIClient()
        self.register_url = '/users/register/'
        self.login_url = '/users/login/'
        self.users_url = '/users/'
        self.user_data = {
            'email': 'testuser@example.com',
            'password': 'TestPass123!',
            'username': 'testuser'
        }
        self.user = User.objects.create_user(
            email=self.user_data['email'],
            password=self.user_data['password'],
            username=self.user_data['username']
        )

    def test_register_success(self):
        data = {
            'email': 'newuser@example.com',
            'password': 'NewPass123!',
            'username': 'newuser'
        }
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_register_invalid(self):
        data = {
            'email': '',
            'password': '',
            'username': ''
        }
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, 400)

    def test_login_success(self):
        data = {
            'email': self.user_data['email'],
            'password': self.user_data['password']
        }
        response = self.client.post(self.login_url, data, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_login_wrong_password(self):
        data = {
            'email': self.user_data['email'],
            'password': 'WrongPassword'
        }
        response = self.client.post(self.login_url, data, format='json')
        self.assertEqual(response.status_code, 401)
        self.assertIn('error', response.data)

    def test_login_nonexistent_user(self):
        data = {
            'email': 'nouser@example.com',
            'password': 'AnyPassword'
        }
        response = self.client.post(self.login_url, data, format='json')
        self.assertEqual(response.status_code, 401)
        self.assertIn('error', response.data)

    def test_login_invalid_data(self):
        data = {
            'email': '',
            'password': ''
        }
        response = self.client.post(self.login_url, data, format='json')
        self.assertEqual(response.status_code, 400)

    def test_users_list(self):
        response = self.client.get(self.users_url)
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.data, list)
        self.assertGreaterEqual(len(response.data), 1)